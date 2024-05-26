const { mongoose } = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const userSchema = new mongoose.Schema({
	name: {
		type: String,
		required: [true, 'User must have a name']
	},
	email: {
		type: String,
		required: [true, 'User must have an email'],
		unique: true,
		lowercase: true,
		validate: [validator.isEmail, 'Please provide a valid email']
	},
	photo: {
		type: String,
		default: 'default.jpg'
	},
	role: {
		type: String,
		enum: ['user', 'guide', 'lead-guide', 'admin'],
		default: 'user'
	},
	password: {
		type: String,
		required: [true, 'User must have a password'],
		minlength: 8,
		select: false // This will not be sent to any response.
	},
	passwordConfirm: {
		type: String,
		required: [true, 'Please confirm your password'],
		validate: {
			// This only work on CREATE and SAVE.
			validator: function (el) {
				return el === this.password
			},
			message: 'Passwords are not the same'
		}
	},
	passwordChangedAt: Date,
	passwordResetToken: String,
	passwordResetExpires: Date,
	active: {
		type: Boolean,
		default: true,
		select: false
	}
})

// userSchema.pre('save', function (next) {
// 	// This will be only true when the new document is saved for the first time.
// 	console.log(this.isNew)

// 	// This will be true
// 	// 1. When the new document is saved for the first time and the passwordResetToken key present in the document.
// 	// 2. When the passwordResetToken is changed or add(for the first time).
// 	console.log(this.isModified('passwordResetToken'))
// 	next()
// })

userSchema.pre('save', async function (next) {
	// console.log(this)
	// Only run if the password is modified
	if (!this.isModified('password')) return next()

	// Hash the password with cost of 12.
	this.password = await bcrypt.hash(this.password, 12)
	// This is to remove the passwordConfirm field to save on database.
	// required means is required input not persisted to database.
	this.passwordConfirm = undefined
	next()
})

userSchema.pre('save', async function (next) {
	if (!this.isModified('password') || this.isNew) return next()
	this.passwordChangedAt = Date.now() - 1000
	next()
})

userSchema.pre(/^find/, function (next) {
	// this is to filter the user by active fields.
	this.find({ active: { $ne: false } })
	next()
})

userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
	return await bcrypt.compare(candidatePassword, userPassword)
}

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
	if (this.passwordChangedAt) {
		const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10)
		return JWTTimestamp < changedTimestamp
	}

	// False means not changed
	return false
}

userSchema.methods.createPasswordResetToken = function () {
	// Generate a random token
	const resetToken = crypto.randomBytes(32).toString('hex')

	// Hash token and set it to resetPasswordToken
	this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex')

	// Set expiration
	this.passwordResetExpires = Date.now() + 10 * 60 * 1000

	return resetToken
}

const User = mongoose.model('User', userSchema)

module.exports = User
