import { Component } from "react";
import "./NavbarDB.css";

import {Link} from "react-router-dom";
import { Menuitems } from "../menuitems/MenuitemsDB";


class NavbarDB extends Component{
    render(){
        return(<>
            <nav className="NavbarItems">
                <ul className="nav-menu">
                    {Menuitems.map((item,index) =>{
                        return(
                            <li key={index}>
                                <Link className={item.cName} to={item.url}>
                                <i className={item}></i>
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

export default NavbarDB