import Navbar from "../components/navbar/Navbar"
import AboutUs from "../components/about/AboutUs";
import Footer from "../components/footer/Footer";
import AboutProject from "../components/about/AboutProject";

function About(){
    return(
        <>
        <Navbar/>
        <AboutProject/>
        <AboutUs/>
        <Footer/>
        </>
    )
}

export default About;