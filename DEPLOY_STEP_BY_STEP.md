# 🚀 PASO A PASO: Deploy do Zombie-Attack no Render

Eu já preparei todo o código. Agora você só precisa seguir estes 2 passos no Render para tudo funcionar.

---

## 1. O Backend (O Cérebro)
*Se você já tem um serviço de Backend criado, mude as configurações dele. Se não, crie um novo **Web Service**.*

1. No painel do Render, vá em **Settings** do seu serviço de Backend.
2. Configure exatamente assim:
   - **Runtime:** `Python 3`
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Clique em **Save Changes**.
4. **IMPORTANTE:** Copie o link do seu backend (ex: `https://zombie-attack-api.onrender.com`). Você vai precisar dele no próximo passo.

---

## 2. O Frontend (A Interface)
*Crie um novo **Static Site** no Render.*

1. Clique em **New +** -> **Static Site**.
2. Conecte seu repositório do GitHub.
3. Configure exatamente assim:
   - **Name:** `zombie-attack-frontend` (ou o que preferir)
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. **ANTES DE CRIAR**, clique em **Advanced** (ou vá na aba **Environment** depois).
5. Adicione esta variável:
   - **Key:** `VITE_API_URL`
   - **Value:** (Cole o link do seu backend que você copiou no passo 1)
6. Clique em **Create Static Site**.

---

## ✅ Como saber se deu certo?
- Quando o Frontend terminar de carregar, abra o link dele.
- Aperte **F12** no seu teclado e vá na aba **Console**.
- Você deve ver: `Zombieware API Base URL: https://seu-backend...`
- Se aparecer o link certo do Render, o login e o registro vão funcionar!

---

## 💡 Alternativa Rápida (Blueprint)
Se você quiser que o Render faça tudo isso sozinho:
1. Vá em **Blueprints** no menu do Render.
2. Conecte seu repo.
3. Ele vai ler o arquivo `render.yaml` que eu criei e configurar os dois serviços de uma vez!
