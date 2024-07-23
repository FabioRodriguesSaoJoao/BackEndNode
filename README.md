Controle de Processos Backend

Este é o backend do projeto Controle de Processos, desenvolvido em Node.js. Ele fornece APIs para gerenciar processos e está integrado com um banco de dados PostgreSQL.

Pré-requisitos
Docker e Docker Compose instalados
Node.js instalado (opcional, caso queira rodar a aplicação sem Docker)

Estrutura do Projeto
server.js: Arquivo principal que define os endpoints da API.
db.js: Arquivo responsável pelo acesso ao banco de dados.

Endpoints
Os endpoints da API estão definidos no arquivo server.js. Abaixo estão alguns exemplos de endpoints disponíveis:
GET /api/processos: Retorna todos os processos.
POST /api/processos: Cria um novo processo.
GET /api/processos/:id: Retorna um processo específico pelo ID.
PUT /api/processos/:id: Atualiza um processo específico pelo ID.
DELETE /api/processos/:id: Deleta um processo específico pelo ID.

Configuração e Execução
Usando Docker
Para rodar a aplicação utilizando Docker, siga os passos abaixo:

Clone o repositório:
git clone https://github.com/usuario/repositorio-backend.git

Navegue até o diretório do backend:
cd Backend/controleproc

Construa e inicie os containers Docker:
docker-compose up --build
A aplicação estará rodando e acessível na porta 6543 do seu localhost.

Usando Node.js (sem Docker)
Clone o repositório:
git clone https://github.com/usuario/repositorio-backend.git

Navegue até o diretório do backend:
cd Backend/controleproc

Instale as dependências:
npm install

Inicie a aplicação:
npm start
A aplicação estará rodando e acessível na porta 6543 do seu localhost.

Contribuição
Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests para melhorias e correções.

Licença
Este projeto está licenciado sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

Contato
Para mais informações, entre em contato com sjrodrigues.fabio@gmail.com
