const nodemailer = require('nodemailer')
const pug = require('pug')
const { convert } = require('html-to-text')

module.exports = class Email {
	constructor(user, url) {
		this.to = user.email
		this.firstName = user.name.split(' ')[0]
		this.url = url
		this.from = `Ajay <${process.env.EMAIL_FROM}>`
	}

	newTransporter() {
		if (process.env.NODE_ENV === 'production') {
			// Send Real email
			return 1
		}

		return nodemailer.createTransport({
			host: process.env.EMAIL_HOST,
			port: process.env.EMAIL_PORT,
			auth: {
				user: process.env.EMAIL_USERNAME,
				pass: process.env.EMAIL_PASSWORD
			}
		})
	}

	async send(template, subject) {
		// 1) Render HTML based on pug
		const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
			firstName: this.firstName,
			url: this.url,
			subject: subject
		})

		// 2) Define the email options
		const mailOptions = {
			from: this.from,
			to: this.to,
			subject: subject,
			html: html,
			text: convert(html, {
				wordwrap: 130
			})
		}
		// 3) Send the email
		await this.newTransporter().sendMail(mailOptions)
	}

	async sendWelcome() {
		await this.send('welcome', 'Welcome to our website.')
	}

	async sendPasswordReset() {
		await this.send('passwordReset', 'Your password reset token (valid for 10 minutes)')
	}
}
