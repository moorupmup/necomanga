@echo off
title MangaDex RU - Server Helper
echo ====================================================
echo  MangaDex RU - Запуск окружения
echo ====================================================
echo.
echo [1] Запуск FastCGI PHP-8.2 для Open Server...
start "" /B /D "F:\OSPanel\v6.5\modules\PHP-8.2" "F:\OSPanel\v6.5\modules\PHP-8.2\php-cgi.exe" -b 127.0.1.25:9000
echo FastCGI запущен на 127.0.1.25:9000
echo.
echo Сайт доступен по адресу: http://manga/
echo.
echo [2] Если нужен dev-сервер Nuxt (http://localhost:3000),
echo     нажмите любую клавишу, иначе закройте это окно.
pause >nul
npm run dev
