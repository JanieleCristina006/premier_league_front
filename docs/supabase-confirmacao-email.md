# Confirmacao de email no Supabase

Para o link de confirmacao abrir a home do app e criar a sessao do usuario:

1. No deploy do frontend, defina `VITE_SITE_URL` com a URL publica do app.

   Exemplo:

   ```env
   VITE_SITE_URL=https://seu-dominio.com
   ```

2. No Supabase, va em `Authentication > URL Configuration`.

3. Em `Site URL`, coloque a mesma URL publica do app.

4. Em `Redirect URLs`, adicione:

   ```text
   https://seu-dominio.com
   https://seu-dominio.com/reset-password
   ```

5. No Supabase, va em `Authentication > Email Templates > Confirm signup`.

6. Cole o HTML de `docs/supabase-email-confirmacao.html`.

O botao do email precisa continuar usando `{{ .ConfirmationURL }}`. Esse link confirma o email no Supabase e usa o `emailRedirectTo` enviado pelo app para voltar para a home.
