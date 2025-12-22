import { useState } from "react";
import Hero from "../components/hero/Hero";
import Keyfeatures from "../components/keyfeatures/Keyfeatures";
import Navbar from "../components/navbar/Navbar";
import Footer from "../components/footer/Footer";
import ExploreProject from "../components/exploreProject";

function Home(){
    const [exploreOpen, setExploreOpen] = useState(false);
    return(
        <>
        <Navbar/>  
        <Hero onExplore={() => setExploreOpen(true)}/>
        <ExploreProject open={exploreOpen} onClose={() => setExploreOpen(false)} />
        <Keyfeatures/>
        <Footer/>
        </>
    )
}

export default Home;