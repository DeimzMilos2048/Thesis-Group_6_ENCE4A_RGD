import "./HeroStyles.css";
import TextType from "../Reactbits/TextType/TextType"

function Hero({ onExplore }){
  return(<>
      <div className="hero">  
          <div className="hero-title">
              <TextType 
                  text={["Mala: A Real Time IoT System for Sustainable Rice Drying"]}
                    typingSpeed={75}
                      pauseDuration={1500}
                        showCursor={true}
                          cursorCharacter="|"/>
      <div className='hero-text'>
      <p>The aforementioned problem motivated the researchers to develop an alternative to traditional post-harvest rice grain dryers, utilizing IoT-based monitoring devices.</p>
        <button type="button" onClick={onExplore} className="btn hero-cta">Click More</button>
        </div>
        </div>
        </div>
    </>)
}

export default Hero;