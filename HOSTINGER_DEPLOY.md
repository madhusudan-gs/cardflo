# Hostinger Deployment Guide

Since Cardflo uses Supabase for the backend, you can host the frontend on **any** Hostinger plan (Shared, Cloud, or VPS).

## 1. Prepare the Build
1.  Open your terminal in the project folder.
2.  Run the build command:
    ```bash
    npm run build
    ```
3.  This will create an `out` folder in your project directory. This folder contains your entire website as static HTML/JS files.

## 2. Deploy to Hostinger
1.  Log in to your **Hostinger hPanel**.
2.  Go to **File Manager** for your domain.
3.  Navigate to the `public_html` folder.
4.  **Delete** the default `default.php` or empty folder contents.
5.  **Upload** all the files *inside* the `out` folder to `public_html`.
    *   *Tip*: Zip the contents of `out`, upload the zip, and extract it on the server.
6.  Your site should now be live!

## 3. Important Note on Routing
If you refresh a page like `/scanner` and get a 404 error, you need to tell Hostinger to redirect all requests to `index.html`.

**Create a `.htaccess` file in `public_html` with this content:**

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>
```

## Option 2: Automated Git Deployment (Recommended)

If you want to just `git push` and have it update your site automatically, use **GitHub Actions**.

1.  **Get FTP Details from Hostinger**:
    *   Go to **Dashboard** > **Files** > **FTP Accounts**.
    *   Note your **FTP IP (Hostname)**, **Username**, and **Password**.

2.  **Add Secrets to GitHub**:
    *   Go to your Repo on GitHub.
    *   **Settings** > **Secrets and variables** > **Actions**.
    *   Click **New repository secret**. Add these three:
        *   `FTP_SERVER`: (Your Hostinger IP, e.g., `185.x.x.x`)
        *   `FTP_USERNAME`: (Your FTP Username)
        *   `FTP_PASSWORD`: (Your FTP Password)

3.  **Push the Code**:
    *   I have already created the special file `.github/workflows/deploy.yml`.
    *   Just push your code to GitHub.
    *   Go to the **Actions** tab in GitHub to watch it build and deploy!
