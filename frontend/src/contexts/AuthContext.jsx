"use client";

import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [teams, setTeams] = useState([]);

  // Set up axios defaults
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        const response = await axios.get(
          "https://sync-project.glitch.me/api/auth/me"
        );
        setUser(response.data);
        // Fetch teams after setting user
        await fetchTeams();
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      localStorage.removeItem("token");
      delete axios.defaults.headers.common["Authorization"];
      setUser(null);
      setCurrentTeam(null);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await axios.get(
        "https://sync-project.glitch.me/api/users/teams"
      );
      const userTeams = response.data || [];
      setTeams(userTeams);

      // Set current team if we have teams and no current team is set
      if (userTeams.length > 0 && !currentTeam) {
        setCurrentTeam(userTeams[0]);
      } else if (userTeams.length === 0) {
        // If user has no teams, create a default team
        await createDefaultTeam();
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
      // If user has no teams, create a default team
      await createDefaultTeam();
    }
  };

  const createDefaultTeam = async () => {
    try {
      const defaultTeamData = {
        name: `${user?.username || "My"} Team`,
        description: "Default team workspace",
      };
      const result = await createTeam(defaultTeamData);
      if (result.success) {
        console.log("Default team created successfully");
      }
    } catch (error) {
      console.error("Error creating default team:", error);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(
        "https://sync-project.glitch.me/api/auth/login",
        {
          email,
          password,
        }
      );

      const { token, user } = response.data;
      localStorage.setItem("token", token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setUser(user);

      // Fetch teams after successful login
      await fetchTeams();

      toast.success("Login successful!");
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "Login failed";
      toast.error(message);
      return { success: false, message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(
        "https://sync-project.glitch.me/api/auth/register",
        userData
      );
      const { token, user } = response.data;
      localStorage.setItem("token", token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setUser(user);

      // Create default team for new user
      await createDefaultTeam();

      toast.success("Registration successful!");
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "Registration failed";
      toast.error(message);
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      await axios.post("https://sync-project.glitch.me/api/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("token");
      delete axios.defaults.headers.common["Authorization"];
      setUser(null);
      setCurrentTeam(null);
      setTeams([]);
      toast.success("Logged out successfully");
    }
  };

  const createTeam = async (teamData) => {
    try {
      const response = await axios.post(
        "https://sync-project.glitch.me/api/users/teams",
        teamData
      );
      const newTeam = response.data;
      setTeams((prev) => [...prev, newTeam]);
      setCurrentTeam(newTeam);
      toast.success("Team created successfully!");
      return { success: true, team: newTeam };
    } catch (error) {
      const message = error.response?.data?.message || "Failed to create team";
      toast.error(message);
      return { success: false, message };
    }
  };

  const switchTeam = (team) => {
    setCurrentTeam(team);
    toast.success(`Switched to ${team.name}`);
  };

  const value = {
    user,
    loading,
    currentTeam,
    teams,
    login,
    register,
    logout,
    createTeam,
    switchTeam,
    fetchTeams,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
