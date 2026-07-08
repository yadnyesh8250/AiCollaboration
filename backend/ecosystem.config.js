module.exports = {
  apps: [
    {
      name: "acollab-backend",
      script: "src/server.js",
      instances: "max", // Utilize all available CPU cores
      exec_mode: "cluster", // Enable cluster mode for load balancing
      watch: false, // Turn off watch in production
      max_memory_restart: "1G", // Restart if process memory exceeds 1GB
      env_production: {
        NODE_ENV: "production",
        PORT: 5001
      }
    }
  ]
};
