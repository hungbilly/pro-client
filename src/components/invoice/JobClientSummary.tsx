
import React from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, User, Mail, Phone, Calendar, MapPin } from "lucide-react";
import { Job, Client } from "@/types";

interface Props {
  job?: Job | null;
  client?: Client | null;
}

const JobClientSummary: React.FC<Props> = ({ job, client }) => {
  if (!job && !client) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {job && (
        <Card className="bg-[#9ECAE1] text-white border-[#9ECAE1]">
          <CardContent className="pt-6">
            <h2 className="font-semibold mb-4">Job</h2>
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="h-4 w-4 text-white" />
              <span className="font-medium">{job.title}</span>
            </div>
            <div className="text-sm">
              {job.description && <div className="mb-3">{job.description}</div>}
              <div className="flex items-center gap-2 mt-2">
                <Calendar className="h-4 w-4 text-white" />
                <span>
                  {job.date ? format(new Date(job.date), "PPP") : "No date specified"}
                  {job.startTime && job.endTime && (
                    <span> ({job.startTime} - {job.endTime})</span>
                  )}
                </span>
              </div>
              {job.location && (
                <div className="flex items-center gap-2 mt-2">
                  <MapPin className="h-4 w-4 text-white" />
                  <span>{job.location}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      {client && (
        <Card className="bg-blue-500 text-white border-blue-600">
          <CardContent className="pt-6">
            <h2 className="font-semibold mb-4">Client</h2>
            <div className="flex items-center gap-2 mb-4">
              <User className="h-4 w-4" />
              <span className="font-medium">{client.name}</span>
            </div>
            <div className="text-sm">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-4 w-4" />
                <span>{client.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>{client.phone}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default JobClientSummary;
