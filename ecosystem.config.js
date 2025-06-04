module.exports = {
    apps: [{
        name: 'messagepilot',
        script: 'node_modules/.bin/next',
        args: 'start',
        instances: '1',
        exec_mode: 'cluster',
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        env: {
            NODE_ENV: 'development', // Ensure this is standard for development
            PORT: 20616
        },
        env_production: {
            NODE_ENV: 'production', // Ensure this is standard for production
            PORT: 20616
        }
    }],
};