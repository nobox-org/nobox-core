module.exports = {
  apps: [
    {
      "name": "nobox-api",
      "script": "npm",
      "args": "run start:debug",
      "log_file": '~/nobox-logs.json',
      merge_logs: true,
    }
  ]
}
