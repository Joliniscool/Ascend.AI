module.exports = {
  apps: [{
    name: 'ascend-ai',
    script: 'app.js',
    cwd: '/home/ubuntu/Ascend.AI/server',
    env_production: {
      NODE_ENV: 'production',
      PORT: 8080,
    },
  }],
};
