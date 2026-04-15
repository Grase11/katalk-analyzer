module.exports = {
  apps: [
    {
      name: 'katalk-static',
      cwd: '/home/ec2-user/environment/katalk-analyzer',
      script: 'server/static-server.js',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 7942,
      },
    },
    {
      name: 'katalk-api',
      cwd: '/home/ec2-user/environment/katalk-analyzer',
      script: 'server/server.js',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        ALLOWED_ORIGINS: 'http://23.22.160.220:7942',
        AWS_REGION: 'us-east-1',
      },
    },
  ],
};
