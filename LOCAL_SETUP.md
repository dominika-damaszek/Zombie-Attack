# 🏠 Como Rodar o Zombie-Attack Localmente

Siga estes passos para rodar o projeto no seu computador:

---

## 🐍 1. Backend (Servidor)

1. Abra um terminal na pasta **backend**:
   ```powershell
   cd backend
   ```
2. Crie e ative o ambiente virtual (opcional, mas recomendado):
   ```powershell
   python -m venv venv
   .\venv\Scripts\activate
   ```
3. Instale as dependências:
   ```powershell
   pip install -r requirements.txt
   ```
4. Inicie o servidor:
   ```powershell
   uvicorn main:app --reload
   ```
   *O backend estará rodando em: `http://127.0.0.1:8000`*

---

## ⚛️ 2. Frontend (Interface)

1. Abra um **novo** terminal na pasta **frontend**:
   ```powershell
   cd frontend
   ```
2. Instale as dependências do Node:
   ```powershell
   npm install
   ```
3. Inicie o servidor de desenvolvimento:
   ```powershell
   npm run dev
   ```
   *O site estará rodando em: `http://localhost:5173` (ou similar)*

---

## 🤖 3. Bot de Jogadores

Se quiser testar com bots localmente:
1. Com o backend e frontend rodando, abra um terminal em `backend`.
2. Rode o comando:
   ```powershell
   .\venv\Scripts\python bot.py
   ```
3. Digite **s** para usar o servidor local.

---

## 💡 Dica de Ouro
Se você fechar o terminal, o servidor para de rodar. Mantenha os dois terminais (Backend e Frontend) abertos enquanto estiver testando!
