import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { nivasaApi } from "@/lib/api";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      let dest = "/login";
      try {
        if (nivasaApi) {
          const session = await nivasaApi.auth.getSession();
          if (session?.user) dest = "/app";
        }
      } catch (e) {
        console.error("Auth check failed:", e);
      }
      navigate(dest, { replace: true });
    };

    checkAuth();
  }, [navigate]);

  return <div className="w-full min-h-screen bg-[#000000]" />;
};

export default Index;
