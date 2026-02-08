    
import React from 'react'
import "./Keyfeatures.css";
import icon1 from "../../assets/images/icon1.png"
import icon2 from "../../assets/images/icon2.png"
import icon3 from "../../assets/images/icon3.png"

function Keyfeatures() {
  return (
    <div class="container">
        <div class="header">
            <h1>KEY FEATURES</h1>
        </div>

        <div class="card-grid">
            <div class="card">
                <img src={icon1} alt="" className="card-icon"/>
                <h3>Real-Time Monitoring and Control</h3>
                <p>IoT sensors continuously track key parameters such as moisture content, temperature & humidity, and weight.</p>
            </div>

            <div class="card">
                <img src={icon2} alt="" className="card-icon"/>
                <h3>Time Reduction and Quality through System</h3>
                <p>Shortens the drying period by applying precise control, saving energy and improving productivity.</p>
            </div>

            <div class="card">
                <img src={icon3} alt="" className="card-icon"/>
                <h3>Quality Assurance and Preservation</h3>
                <p>Maintains rice grain quality by preventing mold growth, cracking, or nutrient loss.</p> 
            </div>
        </div>
    </div>
  )
}

export default Keyfeatures