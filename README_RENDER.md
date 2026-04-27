# 🚀 Como resolver o erro de Deploy no Render

O Render está tentando rodar seu projeto como **Node.js**, mas ele é **Python**. Siga estes passos para corrigir:

## 1. Configurações Manuais (Rápido)
Vá na aba **Settings** do seu serviço no Render e altere os seguintes campos:

| Campo | Valor |
| :--- | :--- |
| **Runtime** | `Python 3` |
| **Root Directory** | `backend` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |

**Após salvar, clique em "Manual Deploy" -> "Clear Cache and Deploy".**

---

## 2. Usando o Blueprint (Recomendado)
Se preferir, apague o serviço atual e crie um novo usando **Blueprints**:
1. Escolha **Blueprints** no menu do Render.
2. Conecte seu repositório.
3. O arquivo `render.yaml` que eu criei vai configurar tudo automaticamente para você.
