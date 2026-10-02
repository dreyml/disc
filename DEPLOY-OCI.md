# Implantação segura na OCI com Nginx existente

Este procedimento adiciona apenas o virtual host `disc.nxuslab.com`. Ele não substitui o `nginx.conf`, não usa `default_server` e não altera as configurações dos outros sistemas.

## 1. Diagnóstico sem alterações

```bash
cat /etc/os-release
uname -m
sudo nginx -t
sudo nginx -T 2>/dev/null | grep -E "server_name|listen|include" | head -n 120
sudo ss -lntp | grep -E ':80|:443'
getent hosts disc.nxuslab.com
curl -4 https://ifconfig.me; echo
```

O IP retornado pelo último comando deve coincidir com o registro DNS do subdomínio.

## 2. Backup recuperável do Nginx

```bash
sudo mkdir -p /root/nginx-backups
sudo tar -C /etc -czf "/root/nginx-backups/nginx-$(date +%Y%m%d-%H%M%S).tar.gz" nginx
```

## 3. Clonar o projeto

```bash
sudo mkdir -p /var/www/disc
sudo chown "$USER":"$USER" /var/www/disc
git clone https://github.com/dreyml/disc.git /var/www/disc
sudo find /var/www/disc -type d -exec chmod 755 {} \;
sudo find /var/www/disc -type f -exec chmod 644 {} \;
sudo chmod 755 /var/www/disc/deploy/update.sh
```

Se `/var/www/disc` já for um clone válido, use:

```bash
cd /var/www/disc
git pull --ff-only origin main
```

## 4. Adicionar somente o virtual host do DISC

Ubuntu/Debian com `sites-available`:

```bash
sudo cp /var/www/disc/deploy/nginx/disc.nxuslab.com.conf /etc/nginx/sites-available/disc.nxuslab.com
sudo ln -s /etc/nginx/sites-available/disc.nxuslab.com /etc/nginx/sites-enabled/disc.nxuslab.com
sudo nginx -t
sudo systemctl reload nginx
```

Oracle Linux/RHEL ou instalação baseada em `conf.d`:

```bash
sudo cp /var/www/disc/deploy/nginx/disc.nxuslab.com.conf /etc/nginx/conf.d/disc.nxuslab.com.conf
sudo nginx -t
sudo systemctl reload nginx
```

Não execute o `reload` se `nginx -t` apresentar erro.

## 5. Testar HTTP antes do certificado

Na própria VM:

```bash
curl -I -H 'Host: disc.nxuslab.com' http://127.0.0.1/
curl -I http://disc.nxuslab.com/
```

Ambos devem responder `200 OK`.

## 6. Liberar rede somente se necessário

Na OCI, a VCN/Subnet precisa permitir entrada TCP 80 e 443. Não abra portas do banco de dados ou portas internas da aplicação.

Se o UFW estiver ativo:

```bash
sudo ufw status
sudo ufw allow 'Nginx Full'
```

Em Oracle Linux com firewalld:

```bash
sudo firewall-cmd --state
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## 7. HTTPS com Certbot

Confirme primeiro que `http://disc.nxuslab.com` funciona externamente.

Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d disc.nxuslab.com --redirect
```

Oracle Linux/RHEL:

```bash
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d disc.nxuslab.com --redirect
```

Validar certificado e renovação:

```bash
sudo nginx -t
sudo certbot renew --dry-run
curl -I https://disc.nxuslab.com/
```

## 8. Atualizações futuras

```bash
cd /var/www/disc
./deploy/update.sh
```

O script usa apenas `git pull --ff-only`, executa os testes quando Node está disponível, valida o Nginx e só então recarrega o serviço.

## Diagnóstico rápido

```bash
sudo nginx -t
sudo systemctl status nginx --no-pager
sudo tail -n 80 /var/log/nginx/disc.error.log
sudo tail -n 30 /var/log/nginx/disc.access.log
```

## Rollback do código

Liste revisões e selecione uma revisão conhecida:

```bash
cd /var/www/disc
git log --oneline -n 10
git switch --detach CODIGO_DO_COMMIT
sudo nginx -t && sudo systemctl reload nginx
```

Para voltar à versão atual:

```bash
cd /var/www/disc
git switch main
git pull --ff-only origin main
sudo nginx -t && sudo systemctl reload nginx
```
