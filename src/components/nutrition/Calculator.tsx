import React from 'react'
import BMR from './BMR'
import Macro from './Macro'
import TDEECalculator from './TDEE'
import { Card } from '../ui/card'

const Calculator = () => {
  return (
    <div>
      <BMR/>
      <div className="max-w-4xl mx-auto">
        <Macro/>
      </div>

      <TDEECalculator/>
    </div>
  )
}

export default Calculator
