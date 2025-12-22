import { Component } from "react";
import "./NavbarStyles.css";
import logo from "../../assets/images/logo2.png";
import {Link} from "react-router-dom";
import { Menuitems } from "../menuitems/Menuitems";


class Navbar extends Component{
    render(){
        return(<>
            <nav className="NavbarItems">
                <img src={logo} alt="" className='logo'/>
                <ul className="nav-menu">
                    {Menuitems.map((item,index) =>{
                        return(
                            <li key={index}>
                                <Link className={item.cName} to={item.url}>
                                {item.title}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
            </>
        );
    }
}

export default Navbar