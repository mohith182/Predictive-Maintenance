# Production Deployment Checklist

## Pre-Deployment

### Environment Setup
- [ ] Copy `.env.example` to `.env` in both frontend and backend
- [ ] Generate secure `SECRET_KEY` (32+ characters)
- [ ] Generate secure `JWT_SECRET_KEY` (32+ characters)
- [ ] Set `APP_ENV=production`
- [ ] Set `DEBUG=false`
- [ ] Configure `DATABASE_URL` for PostgreSQL
- [ ] Set `FRONTEND_URL` to production domain
- [ ] Configure `CORS_ORIGINS` with production domains
- [ ] Set `VITE_API_URL` in frontend `.env`

### Security
- [ ] Verify no secrets in code
- [ ] Verify no secrets in git history
- [ ] Change all default passwords/secrets
- [ ] Configure SSL/TLS certificates
- [ ] Set up firewall rules
- [ ] Review CORS configuration
- [ ] Enable rate limiting

### Database
- [ ] Create PostgreSQL database
- [ ] Create database user with proper permissions
- [ ] Run database migrations
- [ ] Set up database backups
- [ ] Test database connection

### ML Models
- [ ] Train models with production data
- [ ] Verify model files exist in `ml/` directory
- [ ] Test predictions with sample data
- [ ] Verify health calculation formula
- [ ] Test edge cases (NaN, extreme values)

### Testing
- [ ] Run validation script: `python validate_degradation.py`
- [ ] Test all API endpoints
- [ ] Test authentication flow
- [ ] Test prediction endpoints
- [ ] Load testing (if applicable)
- [ ] Security scanning

## Deployment

### Docker Deployment
- [ ] Build backend image: `docker build -f python_backend/Dockerfile -t uptimeai-backend .`
- [ ] Build frontend image: `docker build -f Dockerfile.frontend -t uptimeai-frontend .`
- [ ] Test locally: `docker-compose up`
- [ ] Push images to registry (if using)
- [ ] Deploy to production

### Manual Deployment
- [ ] Install production dependencies
- [ ] Set up systemd service (if Linux)
- [ ] Configure Nginx reverse proxy
- [ ] Set up SSL certificates
- [ ] Configure firewall
- [ ] Start services

## Post-Deployment

### Verification
- [ ] Backend health check: `curl https://api.yourdomain.com/health`
- [ ] Frontend loads correctly
- [ ] API endpoints respond
- [ ] Authentication works
- [ ] Predictions return valid results
- [ ] Database queries work
- [ ] Logs are generated

### Monitoring
- [ ] Set up application monitoring
- [ ] Configure error tracking (Sentry, etc.)
- [ ] Set up uptime monitoring
- [ ] Configure log aggregation
- [ ] Set up alerts for critical errors

### Documentation
- [ ] Document production URLs
- [ ] Document environment variables
- [ ] Document backup procedures
- [ ] Document rollback procedures

## Rollback Plan

If issues occur:
1. Revert to previous Docker image/version
2. Restore database from backup
3. Check logs for errors
4. Verify environment variables
5. Test in staging first

---

**Status**: Ready for production after completing all items

