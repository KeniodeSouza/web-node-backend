# Docker 


Configurar um ecossistema completo com servidor de aplicação, banco de dados e diretório de 
usuários requer uma coordenação precisa. Abaixo, preparei a estrutura necessária para você 
subir esse ambiente, do desenvolvimento (Docker) à orquestração (Kubernetes).
---

## 1. Dockerfiles: A Base da Imagem

Para o **Postgres** e o **LDAP**, geralmente utilizamos imagens oficiais com configurações 
via variáveis de ambiente. 
O foco do `Dockerfile` costuma ser a **Aplicação**.

### Dockerfile (Servidor de Aplicação - Ex: Node.js/Python)

```dockerfile
# Estágio de construção
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Estágio de execução
FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/main.js"]

```
---

## 2. Docker Compose: Orquestração Local

O Compose é ideal para rodar tudo na sua máquina com um único comando: `docker-compose up`.

***/Docker/docker-compose.yml

```yaml
version: '3.8'

services:
  app-server:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - db
      - ldap
    environment:
      DB_HOST: db
      LDAP_URL: ldap://ldap:389

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: my_app_db
    volumes:
      - postgres_data:/var/lib/postgresql/data

  ldap:
    image: osixia/openldap:latest
    ports:
      - "389:389"
    environment:
      LDAP_ORGANISATION: "Minha Empresa"
      LDAP_DOMAIN: "exemplo.org"
      LDAP_ADMIN_PASSWORD: "adminpassword"

volumes:
  postgres_data:

```
---

## 3. Kubernetes: Escalabilidade em Produção

No Kubernetes, traduzimos os serviços do Compose em **Deployments** e **Services**. Abaixo, um exemplo 
consolidado do manifesto para a aplicação (o padrão se repete para os outros).

**Docker/app-deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: app-server
  template:
    metadata:
      labels:
        app: app-server
    spec:
      containers:
      - name: app-container
        image: sua-imagem-app:v1
        ports:
        - containerPort: 3000

apiVersion: v1
kind: Service
metadata:
  name: app-service
spec:
  selector:
    app: app-server
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer

```
---

### Pontos de Atenção

* **Volumes no K8s:** Para o Postgres e LDAP no Kubernetes, você precisará definir `PersistentVolumeClaims` 
  (PVC) para que os dados não sumam ao reiniciar o pod.
* **Secrets:** Nunca deixe senhas expostas nos arquivos YAML. Use `Kubernetes Secrets` para gerenciar as 
  credenciais do banco e do LDAP.

Para garantir que seus dados não desapareçam quando um Pod for reiniciado no Kubernetes, precisamos de uma 
estratégia de persistência. No K8s, utilizamos o par **PersistentVolume (PV)** (o recurso físico) e 
**PersistentVolumeClaim (PVC)** (a "requisição" de espaço feita pelo banco).

Abaixo, apresento os manifestos estruturados para o **Postgres** e o **LDAP**.
---

## 1. Persistência para PostgreSQL

O Postgres é sensível à performance de I/O. Recomendamos o uso de `ReadWriteOnce` (RWO), pois apenas um 
nó deve escrever no disco por vez.

***Docker/postgres-storage.yaml**

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: postgres-pv
  labels:
    type: local
spec:
  storageClassName: manual
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: "/mnt/data/postgres"

apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
spec:
  storageClassName: manual
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi

```

---

## 2. Persistência para OpenLDAP

O LDAP armazena tanto a base de dados (`/var/lib/ldap`) quanto as configurações (`/etc/ldap/slapd.d`). 
Aqui, focaremos no volume de dados principal.

### ldap-storage.yaml

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: ldap-pv
  labels:
    type: local
spec:
  storageClassName: manual
  capacity:
    storage: 5Gi
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: "/mnt/data/ldap"
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ldap-pvc
spec:
  storageClassName: manual
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi

```

---

## Como aplicar no seu Deployment

Para que o banco utilize esses volumes, você deve referenciá-los no arquivo de `Deployment`. 
Veja o exemplo para o Postgres:

```yaml
spec:
  containers:
  - name: postgres
    image: seu-postgres-customizado:v1
    volumeMounts:
    - mountPath: /var/lib/postgresql/data # Caminho interno do container
      name: postgre-storage
  volumes:
  - name: postgre-storage
    persistentVolumeClaim:
      claimName: postgres-pvc # Nome do PVC que criamos acima

```

### Dicas de Ouro:

* **StorageClass:** Em ambientes de nuvem (AWS, GCP, Azure), você não precisa criar o `PersistentVolume` 
  manualmente. Basta definir um `StorageClass` no PVC e a nuvem criará o disco para você automaticamente.
* **Permissions:** O diretório no host (`/mnt/data/...`) deve ter permissões de escrita para o usuário que 
  o container utiliza (geralmente UID 999 para Postgres).
---

Adicionar **Probes** é a diferença entre um sistema que "tenta rodar" e um sistema que **realmente se recupera sozinho**.

* **Liveness Probe:** Verifica se o container está vivo. Se falhar, o K8s reinicia o container.
* **Readiness Probe:** Verifica se o serviço está pronto para receber tráfego. Se falhar, o K8s remove o Pod do *Service* (LB) até que ele volte ao normal.

Aqui estão os manifestos atualizados com as melhores práticas de saúde para cada serviço:
---

## 1. PostgreSQL com Probes (Healthcheck)

Para o Postgres, usamos o comando `pg_isready`, que é nativo e seguro para verificar a disponibilidade sem precisar de autenticação complexa.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres-db
spec:
  # ... (mantenha o seletor e a estratégia anterior)
  template:
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        # ... (mantenha envs e volumes anteriores)
        livenessProbe:
          exec:
            command: ["pg_isready", "-U", "admin", "-d", "app_db"]
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command: ["pg_isready", "-U", "admin", "-d", "app_db"]
          initialDelaySeconds: 5
          periodSeconds: 5

```
---

## 2. OpenLDAP com Probes

Para o LDAP, utilizamos o comando `ldapsearch`. Ele garante que o daemon `slapd` não apenas subiu, mas está respondendo a consultas.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: openldap
spec:
  template:
    spec:
      containers:
      - name: ldap
        image: osixia/openldap:latest
        # ... (mantenha envs e volumes anteriores)
        livenessProbe:
          tcpSocket:
            port: 389
          initialDelaySeconds: 20
          periodSeconds: 20
        readinessProbe:
          exec:
            command:
            - ldapsearch
            - -x
            - -H
            - ldap://localhost:389
            - -b
            - dc=exemplo,dc=org
            - -s
            - base
          initialDelaySeconds: 10
          periodSeconds: 10

```
---

## 3. Servidor de Aplicação (Exemplo Node/Python)

A aplicação deve expor um endpoint (como `/health` ou `/ready`) que valide se a conexão com o banco e o LDAP está ativa.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-server
spec:
  template:
    spec:
      containers:
      - name: app-container
        image: sua-imagem-app:v1
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 15
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5

```
---

### Por que isso é vital?

Imagine que o banco de dados está realizando um "vacuum" pesado ou o LDAP está reindexando. Sem o **Readiness Probe**, sua aplicação 
tentaria enviar requisições e receberia erros de timeout. 

Com o probe, o Kubernetes simplesmente para de enviar tráfego para aquele Pod específico até que ele reporte "estou pronto!", garantindo 
**zero downtime** percebido pelo usuário final.

---

### Resumo de Configurações Recomendadas:

----------------------------------------------------------------------------------------------------------
| Atributo             | Recomendação    |                                                               |
|                      | para Banco/LDAP | Motivo                                                        |
| -------------------- | --------------- | ------------------------------------------------------------- |
| **initialDelay**     | 20s - 30s       | Bancos de dados demoram para inicializar arquivos de sistema. |
| **periodSeconds**    | 10s             | Não sobrecarrega o banco com verificações constantes.         |
| **failureThreshold** | 3               | Permite pequenos "soluços" antes de reiniciar o container.    |
----------------------------------------------------------------------------------------------------------
---

Para expor sua aplicação para o mundo externo de forma segura e profissional, utilizaremos o **Ingress Controller** 
(geralmente o NGINX) em conjunto com o **Cert-Manager**, que automatiza a emissão de certificados SSL/TLS gratuitos 
via **Let's Encrypt**.

Aqui está o passo a passo para configurar o tráfego externo:
---

## 1. O Recurso de Ingress

O Ingress atua como um roteador inteligente. Ele recebe a requisição no domínio (ex: `app.exemplo.org`) e a encaminha para o seu `app-service`.

### ingress.yaml

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod # Referência ao emissor SSL
    nginx.ingress.kubernetes.io/ssl-redirect: "true" # Força HTTPS
spec:
  tls:
  - hosts:
    - app.exemplo.org
    secretName: app-tls-cert # Onde o certificado será guardado
  rules:
  - host: app.exemplo.org
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80

```
---

## 2. Cert-Manager (SSL Automático)

Para que o `secretName: app-tls-cert` seja preenchido automaticamente, precisamos de um **ClusterIssuer**. 
Ele é quem conversa com o Let's Encrypt para validar que você é dono do domínio.

### cluster-issuer.yaml

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: seu-email@exemplo.org
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
    - http01:
        ingress:
          class: nginx

```
---

## 3. Segurança Adicional para o LDAP (LDAPS)

Como o LDAP lida com senhas, expô-lo via Ingress comum não é recomendado. O ideal é usar **TCP Passthrough** no NGINX Ingress ou um 
**LoadBalancer** direto com TLS (Porta 636).

Se a sua aplicação estiver no mesmo cluster que o LDAP, o ideal é **não expor o LDAP para a internet**, mantendo-o acessível apenas 
internamente via `ldap-service.default.svc.cluster.local:389`. Isso reduz drasticamente a superfície de ataque.
---

## 4. Fluxo de Tráfego Final

1. **Usuário** acessa `https://app.exemplo.org`.
2. **DNS** aponta para o IP do LoadBalancer do Ingress Controller.
3. **NGINX Ingress** descriptografa o TLS usando o certificado do Cert-Manager.
4. **Ingress** encaminha o tráfego HTTP puro para o seu **App Pod**.
5. **App Pod** se comunica internamente com o **Postgres** e **LDAP** via rede interna do K8s (ClusterIP).
---

### Checkpoint de Implementação:

* [ ] Instalar o NGINX Ingress Controller (via Helm).
* [ ] Instalar o Cert-Manager (via Helm).
* [ ] Apontar o seu domínio (A Record) para o IP externo do Ingress.
* [ ] Aplicar o `ClusterIssuer` e o `Ingress`.

O **Helm** é o "gerenciador de pacotes" do Kubernetes e é o padrão da indústria para instalar ferramentas como o Ingress e o Cert-Manager. 
Sem ele, você teria que gerenciar centenas de linhas de YAML manualmente.

Aqui estão os comandos para deixar seu cluster pronto para produção:
---

## 1. Instalação do NGINX Ingress Controller

O Ingress Controller é o software que recebe o tráfego da internet e o distribui para seus serviços internos.

```bash
# Adiciona o repositório oficial
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Instala o controller
helm install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace

```
---

## 2. Instalação do Cert-Manager

Ele é o responsável por falar com o **Let's Encrypt**, validar seu domínio e renovar seus certificados SSL automaticamente a cada 90 dias.

```bash
# Adiciona o repositório do Jetstack
helm repo add jetstack https://charts.jetstack.io
helm repo update

# Instala o Cert-Manager com os Custom Resource Definitions (CRDs)
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true

```

---

## 3. Configuração de DNS e Validação

Após instalar o Ingress, o seu provedor de nuvem (AWS, GCP, DigitalOcean, etc) atribuirá um **IP Externo** ao serviço do Nginx.

1. **Descubra o IP:** `kubectl get svc -n ingress-nginx`
2. **Aponte seu domínio:** No seu painel de DNS (Cloudflare, GoDaddy, etc), crie um registro do tipo **A** apontando `app.exemplo.org` para esse IP.

---

## 4. Checklist Final de Produção

Para garantir que seu servidor de aplicação, Postgres e LDAP estejam seguros:

-----------------------------------------------------------------------
| Componente       | Ação de Segurança                                |
|------------------|--------------------------------------------------|
| **Aplicação**    | Exposta via Ingress com **HTTPS**.               |
| **Postgres**     | Acessível apenas **internamente** (ClusterIP).   |
| **LDAP**         | Acessível apenas **internamente** via porta 389. |
| **Certificados** | Renovação **automática** via Cert-Manager.       |
-----------------------------------------------------------------------
---

### Dica de Ouro: Network Policies

Por padrão, no Kubernetes, todos os Pods podem conversar entre si. Para segurança máxima, recomendo criar uma **NetworkPolicy** que 
permita que *apenas* o seu Pod de aplicação se conecte ao Postgres e ao LDAP, bloqueando qualquer outro acesso lateral dentro do cluster.

Implementar **Network Policies** é como configurar um firewall interno para cada microsserviço. No Kubernetes, isso impede que um Pod 
comprometido (como um servidor web vulnerável) consiga "escanear" ou atacar livremente seu banco de dados ou diretório LDAP.

Aqui estão as políticas para isolar seu ambiente:

---

## 1. Política para o PostgreSQL

Esta política diz ao Kubernetes: *"Bloqueie tudo, exceto conexões vindo da minha Aplicação na porta 5432"*.

### postgres-network-policy.yaml

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: postgres-policy
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: postgres # Alvo: Pod do Postgres
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: app-server # Origem permitida: Apenas a aplicação
    ports:
    - protocol: TCP
      port: 5432

```

---

## 2. Política para o LDAP

Semelhante à anterior, mas focada na porta 389 e garantindo que o tráfego seja estritamente controlado.

### ldap-network-policy.yaml

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ldap-policy
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: ldap # Alvo: Pod do LDAP
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: app-server # Origem permitida
    ports:
    - protocol: TCP
      port: 389

```

---

## 3. Consideração Importante: CNI

Para que essas políticas funcionem, seu cluster Kubernetes precisa de um **Plugin de Rede (CNI)** que as suporte, como:

* **Calico** (o mais comum)
* **Cilium** (alta performance com eBPF)
* **Azure/AWS VPC CNI** (em provedores de nuvem específicos)

Se você estiver usando uma solução local básica como o Flannel, as políticas serão aceitas pelo `kubectl`, mas o tráfego não será 
bloqueado.

---

## 🏁 Resumo do seu Ecossistema

Você agora possui uma arquitetura de nível empresarial:

1. **Imagens:** Dockerfiles customizados para App, DB e LDAP.
2. **Desenvolvimento:** Docker Compose para subir tudo localmente.
3. **Persistência:** PVCs e PVs para manter seus dados salvos.
4. **Disponibilidade:** Deployments com Liveness e Readiness Probes.
5. **Exposição:** Ingress Controller com HTTPS via Cert-Manager.
6. **Segurança:** Secrets para senhas e Network Policies para isolamento de rede.

---

Excelente. Para fechar o ciclo, vamos criar um script em **Node.js** que valida as duas conexões. Este script é ideal para rodar 
como um "Init Container" ou como o processo principal da sua aplicação para garantir que a infraestrutura está respondendo.

### Script de Validação (Node.js)

Este script tenta conectar ao Postgres e realizar um "bind" (autenticação) no LDAP.

```javascript
const { Client } = require('pg');
const ldap = require('ldapjs');

// Configurações via Variáveis de Ambiente (definidas no seu Deployment)
const dbConfig = {
  host: process.env.DB_HOST || 'postgres-service',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'app_db',
};

const ldapConfig = {
  url: process.env.LDAP_URL || 'ldap://ldap-service:389',
  bindDN: `cn=admin,dc=exemplo,dc=org`,
  bindCredentials: process.env.LDAP_ADMIN_PASSWORD,
};

async function validateInfrastructure() {
  console.log("🚀 Iniciando validação de infraestrutura...");

  // 1. Validar PostgreSQL
  const pgClient = new Client(dbConfig);
  try {
    await pgClient.connect();
    const res = await pgClient.query('SELECT NOW()');
    console.log("✅ Postgres: Conectado com sucesso! Hora no banco:", res.rows[0].now);
    await pgClient.end();
  } catch (err) {
    console.error("❌ Postgres: Erro de conexão ->", err.message);
  }

  // 2. Validar LDAP
  const ldapClient = ldap.createClient({ url: ldapConfig.url });
  ldapClient.bind(ldapConfig.bindDN, ldapConfig.bindCredentials, (err) => {
    if (err) {
      console.error("❌ LDAP: Erro de autenticação ->", err.message);
    } else {
      console.log("✅ LDAP: Autenticação do admin realizada com sucesso!");
    }
    ldapClient.unbind();
  });
}

validateInfrastructure();

```

---

### Como testar no Kubernetes?

Para testar se as **Network Policies** e o **Service Discovery** estão funcionando, você pode rodar um Pod temporário com este script:

1. **Crie um arquivo `test-pod.yaml**` usando a imagem que você buildou com o Dockerfile inicial.
2. **Execute:** `kubectl apply -f test-pod.yaml`
3. **Verifique os logs:** `kubectl logs -f pod-de-teste`

---

### Dica Final: Variáveis de Ambiente no K8s

Certifique-se de que o seu `Deployment` da aplicação contém estas referências para bater com o script:

```yaml
env:
  - name: DB_HOST
    value: "postgres-service" # Nome do Service que criamos
  - name: LDAP_URL
    value: "ldap://ldap-service:389"
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: app-secrets
        key: POSTGRES_PASSWORD
  - name: LDAP_ADMIN_PASSWORD
    valueFrom:
      secretKeyRef:
        name: app-secrets
        key: LDAP_ADMIN_PASSWORD

```

---

### Próximos Passos Sugeridos

Agora que sua infraestrutura está pronta, segura e validada:

Para automatizar tudo o que construímos, vamos criar um pipeline de **CI/CD no GitHub Actions**. O objetivo é que, a cada `git push`, 
o GitHub:

1. Faça o **Build** das imagens Docker (App, Postgres e LDAP customizados).
2. Envie as imagens para o **Docker Hub** (ou GitHub Registry).
3. Atualize o **Kubernetes** automaticamente com as novas versões.

---

## 1. Preparação: Secrets no GitHub

Antes de criar o arquivo, vá nas configurações do seu repositório no GitHub (**Settings > Secrets and variables > Actions**) e adicione:

* `DOCKER_USERNAME`: Seu usuário do Docker Hub.
* `DOCKER_PASSWORD`: Seu token de acesso ao Docker Hub.
* `KUBE_CONFIG`: O conteúdo do seu arquivo `~/.kube/config` (para o GitHub conseguir acessar seu cluster).

---

## 2. O Arquivo do Pipeline

Crie o arquivo em `.github/workflows/main.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main ] # Dispara o deploy ao commitar na branch main

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Código
        uses: actions/checkout@v4

      - name: Login no Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build e Push - App Server
        uses: docker/build-push-action@v5
        with:
          context: ./app
          push: true
          tags: ${{ secrets.DOCKER_USERNAME }}/app-server:latest

      - name: Build e Push - Postgres Custom
        uses: docker/build-push-action@v5
        with:
          context: ./postgres
          push: true
          tags: ${{ secrets.DOCKER_USERNAME }}/custom-postgres:latest

      - name: Build e Push - LDAP Custom
        uses: docker/build-push-action@v5
        with:
          context: ./ldap
          push: true
          tags: ${{ secrets.DOCKER_USERNAME }}/custom-ldap:latest

  deploy-to-kubernetes:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Código
        uses: actions/checkout@v4

      - name: Configurar Contexto Kubernetes
        uses: azure/k8s-set-context@v3
        with:
          method: kubeconfig
          kubeconfig: ${{ secrets.KUBE_CONFIG }}

      - name: Deploy dos Manifestos
        run: |
          # Aplica Segredos e Storage primeiro
          kubectl apply -f k8s/secrets.yaml
          kubectl apply -f k8s/postgres-storage.yaml
          kubectl apply -f k8s/ldap-storage.yaml
          
          # Aplica Deployments e Services
          kubectl apply -f k8s/postgres-deployment.yaml
          kubectl apply -f k8s/ldap-deployment.yaml
          kubectl apply -f k8s/app-deployment.yaml
          
          # Força o restart para garantir o uso da imagem 'latest'
          kubectl rollout restart deployment/app-server

```

---

## 3. Estrutura de Pastas Recomendada

Para que o pipeline acima funcione, organize seu projeto assim:

```text
meu-projeto/
├── .github/workflows/main.yml
├── app/
│   └── Dockerfile
├── postgres/
│   └── Dockerfile
├── ldap/
│   └── Dockerfile
└── k8s/                   <-- Todos os arquivos YAML que criamos antes
    ├── secrets.yaml
    ├── app-deployment.yaml
    ├── postgres-storage.yaml
    └── ...

```

---

## 4. Por que este Pipeline é Robusto?

* **Isolamento:** Cada serviço tem seu próprio processo de build.
* **Rollout Strategy:** O comando `kubectl rollout restart` garante que, mesmo usando a tag `:latest`, 
  o Kubernetes puxe a imagem nova e substitua os Pods sem derrubar o serviço (Zero Downtime).
* **Segurança:** Credenciais sensíveis nunca ficam no código, apenas nos Secrets do GitHub.

---

### Dica Profissional: Tags de Versão

Para produção real, em vez de usar `:latest`, é recomendável usar o **Hash do Commit** (`${{ github.sha }}`) 
como tag da imagem. Isso permite que você faça um "Rollback" (voltar atrás) instantâneo para uma versão 
específica se algo der errado.



------------------------------------------------------------------------------------------------------------


Embora muitas vezes utilizemos imagens prontas do Docker Hub para esses serviços, criar um `Dockerfile` 
personalizado é a melhor estratégia quando você precisa incluir scripts de inicialização, plugins 
específicos ou configurações de segurança customizadas.

Aqui estão os arquivos separados e otimizados:

---

## 1. Dockerfile para PostgreSQL

Este arquivo utiliza a versão Alpine (mais leve) e configura um diretório para scripts SQL que são 
executados automaticamente na criação do banco.

```dockerfile
# Utiliza a imagem oficial do Postgres como base
FROM postgres:15-alpine

# Define variáveis de ambiente padrão (podem ser sobrescritas no compose)
ENV POSTGRES_DB=app_db
ENV POSTGRES_USER=admin
ENV POSTGRES_PASSWORD=secret

# Copia scripts de inicialização (.sql ou .sh)
# Arquivos em /docker-entrypoint-initdb.d/ são executados por ordem alfabética
COPY ./init-scripts/ /docker-entrypoint-initdb.d/

# Expõe a porta padrão do banco
EXPOSE 5432

# O comando padrão da imagem pai já inicia o servidor, 
# então não é estritamente necessário definir o CMD.

```
---


## 2. Dockerfile para Servidor LDAP (OpenLDAP)

Para o LDAP, utilizaremos a imagem da `osixia`, que é o padrão da indústria para containers, 
permitindo adicionar schemas customizados facilmente.

```dockerfile
# Base sólida e amplamente utilizada para OpenLDAP
FROM osixia/openldap:1.5.0

# Adiciona schemas personalizados (se necessário)
# COPY ./my-schemas/ /container/service/slapd/assets/config/bootstrap/schema/custom/

# Configurações de LOG e TLS
ENV LDAP_LOG_LEVEL=256

# Expõe as portas: 389 (LDAP) e 636 (LDAPS)
EXPOSE 389 636

# A imagem base já possui um entrypoint robusto para gerenciar o daemon slapd

```

---

### Por que usar Dockerfiles em vez de apenas a imagem oficial?

* **Automação:** Você pode embutir a criação de tabelas e usuários iniciais no Postgres assim que o container sobe.
* **Segurança:** Você pode remover pacotes desnecessários ou adicionar certificados SSL/TLS diretamente na imagem.
* **Persistência:** Facilita a padronização de onde os dados serão armazenados.

---

### Estrutura de Pastas Sugerida

Para que esses Dockerfiles funcionem bem, organize seu projeto assim:

```text
project-root/
│
├── postgres/
│   ├── Dockerfile
│   └── init-scripts/    <-- Seus arquivos .sql aqui
│
└── ldap/
    ├── Dockerfile
    └── bootstrap/       <-- Seus arquivos .ldif aqui

```

Para garantir que seu ambiente suba com dados úteis e estrutura pronta, preparei os scripts de inicialização 
tanto para o banco de dados quanto para o diretório de usuários.

Como configuramos o `Dockerfile` anteriormente, lembre-se de colocar esses arquivos nas pastas corretas 
para que o Docker os processe durante o primeiro boot.

---

## 1. Script SQL para PostgreSQL (`init.sql`)

Este script cria uma tabela de usuários e uma tabela de logs, além de inserir um usuário administrativo inicial.

Coloque este arquivo em: `./postgres/init-scripts/init.sql`

```sql
-- Criação de um Schema para organizar melhor os dados
CREATE SCHEMA IF NOT EXISTS app_schema;

-- Tabela de Usuários (Sincronizada com IDs do LDAP se necessário)
CREATE TABLE IF NOT EXISTS app_schema.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Tabela de Logs de Acesso
CREATE TABLE IF NOT EXISTS app_schema.access_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES app_schema.users(id),
    action VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inserção de dados iniciais para teste
INSERT INTO app_schema.users (username, email) VALUES 
('admin_local', 'admin@exemplo.org'),
('dev_user', 'dev@exemplo.org');

-- Permissões básicas
GRANT ALL PRIVILEGES ON SCHEMA app_schema TO admin;

```

---

## 2. Arquivo LDIF para OpenLDAP (`bootstrap.ldif`)

O formato LDIF (*LDAP Data Interchange Format*) define a hierarquia do diretório. 
Vamos criar uma Unidade Organizacional (OU) para usuários e grupos.

Coloque este arquivo em: `./ldap/bootstrap/bootstrap.ldif`

```ldif
# Definição da Unidade Organizacional para Pessoas
dn: ou=users,dc=exemplo,dc=org
objectClass: organizationalUnit
ou: users

# Definição da Unidade Organizacional para Grupos
dn: ou=groups,dc=exemplo,dc=org
objectClass: organizationalUnit
ou: groups

# Um usuário de teste (João Silva)
dn: cn=jsilva,ou=users,dc=exemplo,dc=org
objectClass: inetOrgPerson
objectClass: posixAccount
objectClass: shadowAccount
cn: jsilva
sn: Silva
givenName: Joao
uid: jsilva
displayName: Joao Silva
uidNumber: 10000
gidNumber: 10000
homeDirectory: /home/jsilva
loginShell: /bin/bash
mail: jsilva@exemplo.org
userPassword: {password123}

# Grupo de Administradores
dn: cn=admins,ou=groups,dc=exemplo,dc=org
objectClass: posixGroup
cn: admins
gidNumber: 10001
memberUid: jsilva

```
---

### Como isso funciona no Kubernetes?

Para que esses scripts sejam lidos pelos containers no K8s, você tem duas opções principais:

1. **Embutir na Imagem (Recomendado para dados estáticos):** No seu `Dockerfile`, use o comando `COPY` para colocar os arquivos nas 
   pastas de inicialização (`/docker-entrypoint-initdb.d/` no Postgres).
2. **ConfigMap (Recomendado para flexibilidade):** Crie um `ConfigMap` com o conteúdo desses scripts e monte-os como volumes nos caminhos 
   mencionados acima.

### Dica de Segurança

No arquivo LDIF, o campo `userPassword` deve preferencialmente usar um hash (como SSHA ou BCRYPT). O exemplo acima usa texto simples 
entre chaves apenas para fins didáticos de teste inicial.

Aqui estão os manifestos de **ConfigMap** para o PostgreSQL e o LDAP. Esta é a forma mais flexível de gerir scripts de inicialização, 
pois permite que alteres a estrutura do banco de dados ou os utilizadores do directório sem precisar de reconstruir as imagens Docker.

---

### 1. ConfigMap para PostgreSQL (`init-db-config`)

Este ficheiro será montado na pasta `/docker-entrypoint-initdb.d/` do contentor Postgres.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-init-config
  namespace: default
data:
  init.sql: |
    CREATE SCHEMA IF NOT EXISTS app_schema;

    CREATE TABLE IF NOT EXISTS app_schema.users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    INSERT INTO app_schema.users (username, email) 
    VALUES ('admin_local', 'admin@exemplo.org')
    ON CONFLICT DO NOTHING;

```

---

### 2. ConfigMap para LDAP (`init-ldap-config`)

Este ficheiro será montado na pasta de bootstrap do OpenLDAP.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ldap-init-config
  namespace: default
data:
  bootstrap.ldif: |
    dn: ou=users,dc=exemplo,dc=org
    objectClass: organizationalUnit
    ou: users

    dn: ou=groups,dc=exemplo,dc=org
    objectClass: organizationalUnit
    ou: groups

    dn: cn=admin_user,ou=users,dc=exemplo,dc=org
    objectClass: inetOrgPerson
    cn: admin_user
    sn: Admin
    mail: admin@exemplo.org
    userPassword: {SSHA}suasenhaencriptada

```

---

### 3. Como atualizar os seus Deployments

Para que os contentores leiam estes ficheiros, tens de adicionar a secção `volumes` e `volumeMounts` nos teus ficheiros de Deployment:

#### No Deployment do Postgres:

```yaml
spec:
  containers:
  - name: postgres
    image: postgres:15-alpine
    volumeMounts:
    - name: init-script
      mountPath: /docker-entrypoint-initdb.d/init.sql
      subPath: init.sql
  volumes:
  - name: init-script
    configMap:
      name: postgres-init-config

```

#### No Deployment do LDAP:

```yaml
spec:
  containers:
  - name: ldap
    image: osixia/openldap:latest
    volumeMounts:
    - name: ldap-bootstrap
      mountPath: /container/service/slapd/assets/config/bootstrap/ldif/custom/bootstrap.ldif
      subPath: bootstrap.ldif
  volumes:
  - name: ldap-bootstrap
    configMap:
      name: ldap-init-config

```

---

### Vantagens desta abordagem:

1. **Versionamento:** Podes guardar estes ConfigMaps no teu Git junto com os outros manifestos.
2. **Agilidade:** Se precisares de adicionar uma nova tabela, basta editar o ConfigMap e reiniciar o Pod (`kubectl rollout restart`).
3. **Separação:** A imagem Docker permanece "limpa" e genérica, enquanto a lógica de dados fica no Kubernetes.

Perfeito! Agora que temos toda a infraestrutura definida — desde os Dockerfiles até os manifestos de rede, segurança e persistência 
no Kubernetes — o próximo passo lógico é o **Teste de Conectividade E2E (End-to-End)**.

Para validar se o fluxo completo está funcionando, vamos simular o ciclo de vida de uma requisição que atravessa todas as camadas que 
configuramos.

---

### O Cenário de Teste Ideal

O teste consiste em garantir que:

1. O **Ingress** recebe a chamada externa (HTTPS).
2. A **Aplicação** resolve o nome do `postgres-service` e `ldap-service` (DNS interno).
3. As **Network Policies** permitem o tráfego de saída da App para os bancos.
4. O **Postgres** e o **LDAP** autenticam com as senhas vindas dos **Secrets**.

---

### Script de Teste Automatizado (Job do Kubernetes)

Em vez de testar manualmente, podemos criar um `Job` temporário no Kubernetes que executa nossa validação e nos dá um veredito "Passou/Falhou".

**`test-connectivity-job.yaml`**

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: infra-validation-test
spec:
  template:
    spec:
      containers:
      - name: tester
        image: node:20-slim
        command: ["node", "-e"]
        args:
          - |
            const { Client } = require('pg');
            const ldap = require('ldapjs');
            
            async function test() {
              console.log("🔍 Testando Postgres...");
              const pg = new Client({ host: 'postgres-service', user: 'admin', password: process.env.PG_PASS, database: 'app_db' });
              await pg.connect();
              console.log("✅ Postgres OK!");
              
              console.log("🔍 Testando LDAP...");
              const ldapClient = ldap.createClient({ url: 'ldap://ldap-service:389' });
              ldapClient.bind('cn=admin,dc=exemplo,dc=org', process.env.LDAP_PASS, (err) => {
                if (err) console.error("❌ LDAP Falhou:", err);
                else console.log("✅ LDAP OK!");
                process.exit(err ? 1 : 0);
              });
            }
            test();
        env:
        - name: PG_PASS
          valueFrom: { secretKeyRef: { name: app-secrets, key: POSTGRES_PASSWORD } }
        - name: LDAP_PASS
          valueFrom: { secretKeyRef: { name: app-secrets, key: LDAP_ADMIN_PASSWORD } }
      restartPolicy: Never

```

---

### Como Executar e Validar

1. **Aplique o Job:**
```bash
kubectl apply -f test-connectivity-job.yaml

```


2. **Verifique o Status:**
```bash
kubectl get jobs

```


3. **Veja o Resultado nos Logs:**
```bash
kubectl logs -l job-name=infra-validation-test

```



---

### O que fazer se falhar?

* **Connection Timeout:** Geralmente é culpa da `NetworkPolicy`. Verifique se os `labels` (app: app-server) estão idênticos nos 
Pods e nas políticas.
* **Authentication Failed:** Verifique se o `Secret` foi criado corretamente e se o `ConfigMap` de inicialização rodou (o Postgres 
só executa o init.sql na primeira vez que o volume está vazio).
* **DNS Error:** Certifique-se de que os `Services` (ClusterIP) foram criados com os nomes exatos utilizados nas strings de conexão.

---

### Conclusão do Projeto

Você agora tem um ambiente completo, orquestrado e seguro.

Aqui está o seu **Guia de Referência Final**. Este `README.md` consolida toda a arquitetura que construímos, os comandos de execução 
e a estrutura do projeto para que qualquer pessoa (ou você no futuro) consiga subir o ambiente do zero.

---

# 🏗️ Projeto: Infraestrutura Escalável K8s (App + Postgres + LDAP)

Este repositório contém a definição completa de uma infraestrutura moderna, utilizando **Docker** para desenvolvimento e **Kubernetes** 
para produção, com foco em segurança, persistência e automação.

## 📁 Estrutura do Projeto
```text
project-root/
├── app/                # Código fonte e Dockerfile da Aplicação
├── postgres/           # Dockerfile e scripts SQL de inicialização
├── ldap/               # Dockerfile e arquivos LDIF de bootstrap
├── k8s/                # Manifestos Kubernetes
│   ├── base/           # Deployments, Services e ConfigMaps
│   ├── storage/        # PersistentVolumes e Claims
│   ├── network/        # Ingress e NetworkPolicies
│   └── security/       # Secrets e ClusterIssuer
└── .github/workflows/  # Pipeline de CI/CD (GitHub Actions)

```
---


## 🚀 Como Executar

### 1. Desenvolvimento Local (Docker Compose)

Para subir o ambiente rapidamente na sua máquina:

```bash
docker-compose up -d

```

* **App:** http://localhost:3000
* **Postgres:** localhost:5432
* **LDAP:** localhost:389

### 2. Produção (Kubernetes)

Siga a ordem de aplicação para evitar erros de dependência:

**A. Preparação do Cluster (Helm):**

```bash
# Ingress Controller & Cert-Manager
helm install nginx-ingress ingress-nginx/ingress-nginx -n ingress-nginx --create-namespace
helm install cert-manager jetstack/cert-manager -n cert-manager --create-namespace --set installCRDs=true

```

**B. Persistência e Segurança:**

```bash
kubectl apply -f k8s/storage/
kubectl apply -f k8s/security/
kubectl apply -f k8s/base/postgres-init-config.yaml
kubectl apply -f k8s/base/ldap-init-config.yaml

```

**C. Deploy dos Serviços:**

```bash
kubectl apply -f k8s/base/postgres-deployment.yaml
kubectl apply -f k8s/base/ldap-deployment.yaml
kubectl apply -f k8s/base/app-deployment.yaml
kubectl apply -f k8s/network/

```

---

## 🛡️ Camadas de Segurança Implementadas

| Recurso | Descrição |
| --- | --- |
| **Network Policies** | Isolamento total. Apenas a App fala com o DB e LDAP. |
| **Secrets** | Senhas criptografadas e injetadas via variáveis de ambiente. |
| **Ingress TLS** | HTTPS automático via Let's Encrypt e Cert-Manager. |
| **Probes** | Liveness e Readiness garantem que tráfego só chegue em pods saudáveis. |

---

## 🛠️ Manutenção e Logs

* **Verificar saúde dos serviços:** `kubectl get pods`
* **Ler logs da aplicação:** `kubectl logs -f deployment/app-server`
* **Acessar o banco manualmente:** ```bash
kubectl exec -it deployment/postgres-db -- psql -U admin -d app_db
```


```
---

## 🔄 CI/CD

O pipeline no GitHub Actions automatiza o processo:

1. **Build** das imagens Docker.
2. **Push** para o Docker Hub.
3. **Deploy** automático no Cluster via `KUBE_CONFIG`.

---

**Parabéns! Sua infraestrutura está completa