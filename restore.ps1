Write-Host "💀 Forçando encerramento de processos travados..."
taskkill /F /IM node.exe 2>$null

# 2. ISOLAR PROJETOS (Renomeia package.json da raiz para evitar conflito de Monorepo)
cd D:\logistica_pessoal_app_portal-main
if (Test-Path package.json) { Rename-Item package.json package.json.bak }

# 3. LIMPEZA PROFUNDA
Write-Host "🧹 Removendo lixo corrompido..."
Get-ChildItem -Recurse -Include node_modules,package-lock.json | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

# 4. INSTALAR SERVER (Correção Prisma 5 para Node v24)
Write-Host "⚙️ Instalando Backend..."
cd server
npm install prisma@5.10.2 @prisma/client@5.10.2 --save-exact
npm install --legacy-peer-deps
npx prisma db push
npx prisma generate
cd ..

# 5. INSTALAR PORTAL (Frontend)
Write-Host "💻 Instalando Frontend..."
cd apps/portal-rh
npm install --legacy-peer-deps
cd ..\..

# 6. RESTAURAR ESTRUTURA
if (Test-Path package.json.bak) { Rename-Item package.json.bak package.json }

Write-Host "✅ Instalação e Banco de Dados reparados."
