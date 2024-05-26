// book-tour(data-tour-id=`${tour.id}`)

import { showAlert } from './alerts'

// This is your test publishable API key.
const stripe = Stripe(
	'pk_test_51PJu9LSIUGraheEjWHuFwWwq1KsyDpwSW7a4RBvSypA5UJqaUgvrWcqWcVNfHFWFKzzbTJVfkVspdLoNokPicZqI006HAqe6io'
)

export const bookTour = async tourId => {
	try {
		// 1) Get checkout session from API
		const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`)

		// 2) Create checkout form  + charge credit card

		const result = await stripe.redirectToCheckout({
			sessionId: session.data.session.id
		})

		// 2) create checkout form  + charge credit card
	} catch (e) {
		showAlert(e)
	}
}

// Create a Checkout Session
// https://docs.stripe.com/checkout/embedded/quickstart
// async function initialize() {
// 	const fetchClientSecret = async () => {
// 		const response = await fetch('/create-checkout-session', {
// 			method: 'POST'
// 		})
// 		const { clientSecret } = await response.json()
// 		return clientSecret
// 	}

// 	const checkout = await stripe.initEmbeddedCheckout({
// 		fetchClientSecret
// 	})

// 	// Mount Checkout
// 	checkout.mount('#checkout')
// }
