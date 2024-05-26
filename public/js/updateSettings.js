import axios from 'axios'
import { showAlert } from './alerts'

// type is either 'password' or 'data'

export const updateSettings = async (data, type) => {
	try {
		const url = type === 'password' ? '/api/v1/users/updateMyPassword' : '/api/v1/users/updateMe'
		const res = await axios({
			method: 'PATCH',
			url,
			data
		})

		if (res.data.status === 'success') {
			showAlert('Success', 'Updated')
		}
	} catch (e) {
		showAlert('error', e.response.data.message)
		return e.response.data.message
	}
}
