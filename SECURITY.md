# Security Configuration

## Admin Password Setup

For production deployment, add this to your `.env` file:

```bash
ADMIN_PASSWORD=SecureAI#2026!TrainProtect$9x7m
```

### Generate Your Own Secure Password

**Recommended password format:**
- Minimum 16 characters
- Mix of uppercase, lowercase, numbers, and special characters
- Avoid dictionary words or personal information

**Example generators:**
```bash
# Using OpenSSL (Linux/Mac/WSL)
openssl rand -base64 24

# Using PowerShell (Windows)
-join ((48..57) + (65..90) + (97..122) + (33..47) | Get-Random -Count 24 | ForEach-Object {[char]$_})
```

### ⚠️ Security Best Practices

1. **Never commit `.env` to git** - Already in `.gitignore`
2. **Use different passwords** for development and production
3. **Store securely** - Use environment variable managers (Vercel, AWS Secrets Manager, etc.)
4. **Rotate regularly** - Change password every 90 days
5. **Share securely** - Use encrypted channels (1Password, LastPass, etc.)

### Environment Variable Setup

**Local Development:**
Add to `.env.local`:
```bash
ADMIN_PASSWORD=your-dev-password-here
```

**Vercel Deployment:**
1. Go to Project Settings → Environment Variables
2. Add `ADMIN_PASSWORD` with your production password
3. Select Production/Preview/Development environments
4. Save and redeploy

**Other Platforms:**
- **AWS**: Use AWS Secrets Manager or Parameter Store
- **Heroku**: Use `heroku config:set ADMIN_PASSWORD="your-password"`
- **Railway**: Add in Variables section
- **Netlify**: Add in Environment Variables

### Current Generated Password (For Initial Setup)

```
SecureAI#2026!TrainProtect$9x7m
```

**⚠️ IMPORTANT:** Change this immediately after your first deployment!

### What This Password Protects

- Deleting individual trained files
- Bulk deletion of training data
- Any operation that removes AI knowledge

### Password Prompt Behavior

- Users will see a security prompt before deletion
- Invalid password = operation cancelled
- Password verification happens server-side
- No rate limiting (consider adding for production)

### Future Enhancements

Consider adding:
- Rate limiting for password attempts
- Audit logging for deletion operations
- Multi-factor authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Session management with JWT
