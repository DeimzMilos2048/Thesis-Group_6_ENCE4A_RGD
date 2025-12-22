import React from 'react'
import './AboutUs.css'
import person_1 from '../../assets/images/person-1.jpg'
import person_2 from '../../assets/images/person-2.jpg'
import person_3 from '../../assets/images/person-3.JPG'


function AboutUs() {
  return (<>
  <div className="container">
   <div class="headerabout">
            <h1>ABOUT US</h1>
        </div>
    <div className='persons'>
       
      <div className='person'>
      <img src={person_1} alt="" />
      <div className="caption">
        <img src="" alt="" />
        <p>Angelo Gabriel Bautista</p>
      </div>
      </div>

      <div className='person'>
      <img src={person_2} alt="" />
      <div className="caption">
        <img src="" alt="" />
        <p>Deimz C. Milos</p>
      </div>
      </div>

      <div className='person'>
      <img src={person_3} alt="" />
      <div className="caption">
        <img src="" alt="" />
        <p>Jessie Mae Roquero</p>
      </div>
      </div>
    </div>
    </div>
    </>
  )
}
export default AboutUs