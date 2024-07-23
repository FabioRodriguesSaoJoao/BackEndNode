# Use a imagem oficial do Node.js
FROM node:18

# Cria o diretório da aplicação
WORKDIR /usr/src/app

# Copia os arquivos do projeto para o container
COPY package*.json ./
COPY . .

# Instala as dependências
RUN npm install

# Expõe a porta que o aplicativo vai rodar
EXPOSE 6543

# Comando para iniciar o servidor
CMD [ "node", "server.js" ]
