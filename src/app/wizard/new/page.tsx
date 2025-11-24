"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, User, MapPin, Phone, Mail, ArrowRight } from "lucide-react";

export default function NewWizardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientName: "",
    address: "",
    phone: "",
    email: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/wizard/${data.project.id}/intake`);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50">
      <div className="container max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Start New Project</h1>
          <p className="text-lg text-slate-600">
            Enter client information to begin creating their energy plan
          </p>
        </div>

        <Card className="bg-white border-2 border-slate-200 shadow-lg">
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="clientName" className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <User className="h-4 w-4 text-teal-600" />
                  Client Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="clientName"
                  required
                  value={formData.clientName}
                  onChange={(e) =>
                    setFormData({ ...formData, clientName: e.target.value })
                  }
                  placeholder="John Smith"
                  className="bg-white border-2 border-slate-300 text-slate-900 h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-teal-600" />
                  Property Address
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="123 Main St, City, State 12345"
                  className="bg-white border-2 border-slate-300 text-slate-900 h-12 text-base"
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-teal-600" />
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="(555) 123-4567"
                    className="bg-white border-2 border-slate-300 text-slate-900 h-12 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-teal-600" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="client@example.com"
                    className="bg-white border-2 border-slate-300 text-slate-900 h-12 text-base"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/")}
                  className="bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-6 text-lg flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white px-8 py-6 text-lg shadow-lg flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Create Project
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
