"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";

export interface LabProfile {
  labId: string;
  labName: string;
  facilityType: string;
  location: string;
}

export const PRECONFIGURED_LABS: LabProfile[] = [
  {
    labId: "LAB-REF-AIIMS",
    labName: "AIIMS Reference Microbiology Lab",
    facilityType: "National Reference & Tertiary Care",
    location: "New Delhi, India",
  },
  {
    labId: "LAB-SURV-NCDC",
    labName: "NCDC Antimicrobial Surveillance Unit",
    facilityType: "Public Health Surveillance",
    location: "Karnataka / South Zone",
  },
  {
    labId: "LAB-RES-PGIMER",
    labName: "PGIMER Medical Microbiology Lab",
    facilityType: "Academic Research & Surveillance",
    location: "Chandigarh, India",
  },
];

interface AuthContextType {
  isAuthenticated: boolean;
  labId: string | null;
  labProfile: LabProfile | null;
  accessKey: string | null;
  isLoading: boolean;
  isMockMode: boolean;
  toggleMockMode: (val: boolean) => void;
  login: (labId: string, accessKey: string, customName?: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [labId, setLabId] = useState<string | null>(null);
  const [accessKey, setAccessKey] = useState<string | null>(null);
  const [labProfile, setLabProfile] = useState<LabProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMockMode, setIsMockMode] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Initialize session from sessionStorage
    const storedLabId = sessionStorage.getItem("gf_lab_id");
    const storedKey = sessionStorage.getItem("gf_access_key");
    const storedName = sessionStorage.getItem("gf_lab_name");
    const storedFacility = sessionStorage.getItem("gf_lab_facility");
    const storedLocation = sessionStorage.getItem("gf_lab_location");

    if (storedLabId && storedKey) {
      setLabId(storedLabId);
      setAccessKey(storedKey);
      setLabProfile({
        labId: storedLabId,
        labName: storedName || storedLabId,
        facilityType: storedFacility || "Research Laboratory",
        location: storedLocation || "Authorized Site",
      });
    }

    setIsMockMode(api.isMockMode());
    setIsLoading(false);
  }, []);

  const login = async (inputLabId: string, inputKey: string, customName?: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Validate lab credentials against backend or preconfigured profiles
      const foundProfile = PRECONFIGURED_LABS.find(
        (l) => l.labId.toUpperCase() === inputLabId.trim().toUpperCase()
      );

      const profile: LabProfile = foundProfile || {
        labId: inputLabId.trim(),
        labName: customName || `Laboratory ${inputLabId.trim()}`,
        facilityType: "Affiliated Clinical / Research Facility",
        location: "Institutional Node",
      };

      sessionStorage.setItem("gf_lab_id", profile.labId);
      sessionStorage.setItem("gf_access_key", inputKey.trim());
      sessionStorage.setItem("gf_lab_name", profile.labName);
      sessionStorage.setItem("gf_lab_facility", profile.facilityType);
      sessionStorage.setItem("gf_lab_location", profile.location);

      setLabId(profile.labId);
      setAccessKey(inputKey.trim());
      setLabProfile(profile);

      return true;
    } catch {
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem("gf_lab_id");
    sessionStorage.removeItem("gf_access_key");
    sessionStorage.removeItem("gf_lab_name");
    sessionStorage.removeItem("gf_lab_facility");
    sessionStorage.removeItem("gf_lab_location");

    setLabId(null);
    setAccessKey(null);
    setLabProfile(null);

    router.push("/login");
  };

  const toggleMockMode = (val: boolean) => {
    api.setMockMode(val);
    setIsMockMode(val);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!labId,
        labId,
        labProfile,
        accessKey,
        isLoading,
        isMockMode,
        toggleMockMode,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
