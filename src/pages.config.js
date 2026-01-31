/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Admin from './pages/Admin';
import CreateListing from './pages/CreateListing';
import Landing from './pages/Landing';
import Marketplace from './pages/Marketplace';
import Messages from './pages/Messages';
import Onboarding from './pages/Onboarding';
import Profile from './pages/Profile';
import Requests from './pages/Requests';
import Sessions from './pages/Sessions';
import Settings from './pages/Settings';
import SkillDetails from './pages/SkillDetails';
import VideoCall from './pages/VideoCall';
import Wallet from './pages/Wallet';
import MyCourses from './pages/MyCourses';
import EditListing from './pages/EditListing';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Login": Login,
    "SignUp": SignUp,
    "Admin": Admin,
    "CreateListing": CreateListing,
    "Landing": Landing,
    "Marketplace": Marketplace,
    "Messages": Messages,
    "Onboarding": Onboarding,
    "Profile": Profile,
    "Requests": Requests,
    "Sessions": Sessions,
    "Settings": Settings,
    "SkillDetails": SkillDetails,
    "VideoCall": VideoCall,
    "Wallet": Wallet,
    "MyCourses": MyCourses,
    "EditListing": EditListing,
}

export const pagesConfig = {
    mainPage: "Marketplace",
    Pages: PAGES,
    Layout: __Layout,
};