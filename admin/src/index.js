import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import 'core-js'
import './index.css'
import {Toaster} from 'react-hot-toast'

import App from './App'
import store from './store'

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <App />
    <Toaster
      position="top-right"
      reverseOrder={false}
    />
  </Provider>,
)
