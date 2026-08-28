import { History, Home, User, Users } from "lucide-react";

/*
  The four application sections, in the order they appear in the sidebar.
  Sidebar renders them as links and TopBar uses them to label the current page,
  so the list lives here instead of being written out twice.
*/
export const navigationItems = [
  { label: "Home", path: "/", icon: Home },
  { label: "History", path: "/history", icon: History },
  { label: "Friends", path: "/friends", icon: Users },
  { label: "Profile", path: "/profile", icon: User },
];
