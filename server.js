const mongoose = require('mongoose')
const dotenv = require('dotenv')

process.on('uncaughtException', err => {
	console.log('Uncaught exception')
	console.log(err.name, err.message)
	process.exit(1)
})

dotenv.config({ path: './config.env' })
const app = require('./app')

const DB = process.env.DATABASE.replace('<PASSWARD>', process.env.DATABASE_PASSWORD)
mongoose.connect(DB).then(() => console.log('DB connection established'))

const PORT = process.env.PORT || 3000

const server = app.listen(PORT, () => {
	console.log(`App running on port ${PORT}.`)
})

process.on('unhandledRejection', err => {
	console.log('Unhandled rejection')
	console.log(err.name, err.message)
	server.close(() => process.exit(1))
})
