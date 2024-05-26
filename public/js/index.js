import '@babel/polyfill'
import { login, logout } from './login'
import { updateSettings } from './updateSettings'
import { bookTour } from './stripe'

const logOutBtn = document.querySelector('.nav_el--logout')
const loginForm = document.querySelector('.form--login')
const userDataForm = document.querySelector('.form-user-data')
const userPassword = document.querySelector('.form-user-password')
const bookBtn = document.getElementById('.book-tour')

if (loginForm) {
	loginForm.addEventListener('submit', e => {
		e.preventDefault()
		const email = document.getElementById('email').value
		const password = document.getElementById('password').value
		login(email, password)
	})
}

if (userDataForm)
	userDataForm.addEventListener('click', e => {
		e.preventDefault()
		const form = new FormData()
		form.append('name', document.getElementById('name').value)
		form.append('email', document.getElementById('email').value)
		form.append('photo', document.getElementById('photo').files[0])
		updateSettings(form, 'data')
	})

if (userPassword)
	userPassword.addEventListener('click', async e => {
		e.preventDefault()
		document.querySelector('.btn--save-password').textContent = 'Updating....'
		const passwordCurrent = document.getElementById('password-current').value
		const password = document.getElementById('password').value
		const passwordConfirm = document.getElementById('password-confirm').value
		await updateSettings({ passwordCurrent, password, passwordConfirm }, 'password')
		document.getElementById('password-current').value = ''
		document.getElementById('password').value = ''
		document.getElementById('password-confirm').value = ''
		document.querySelector('.btn--save-password').textContent = 'Save password'
	})

if (logOutBtn) logOutBtn.addEventListener('click', logout)

if (bookBtn)
	bookBtn.addEventListener('click', async e => {
		const { tourId } = e.target.dataset
		bookTour(tourId)
	})
