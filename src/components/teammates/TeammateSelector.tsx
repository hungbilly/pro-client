
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, X, UserPlus, Mail } from 'lucide-react';
import { Teammate } from '@/types/teammate';
import { useQuery } from '@tanstack/react-query';
import { getTeammates } from '@/lib/teammateStorage';
import { useCompany } from '@/components/CompanySelector';

interface TeammateSelectorProps {
  selectedTeammates: Array<{ id?: string; name: string; email: string }>;
  onTeammatesChange: (teammates: Array<{ id?: string; name: string; email: string }>) => void;
}

const TeammateSelector: React.FC<TeammateSelectorProps> = ({
  selectedTeammates,
  onTeammatesChange
}) => {
  const { selectedCompany } = useCompany();
  const [manualEmail, setManualEmail] = useState('');
  const [manualName, setManualName] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);

  const { data: teammates = [] } = useQuery({
    queryKey: ['teammates', selectedCompany?.id],
    queryFn: () => selectedCompany ? getTeammates(selectedCompany.id) : [],
    enabled: !!selectedCompany
  });

  const availableTeammates = teammates.filter(
    teammate => !selectedTeammates.some(selected => selected.email === teammate.email)
  );

  const handleAddExistingTeammate = (teammateId: string) => {
    const teammate = teammates.find(t => t.id === teammateId);
    if (teammate) {
      onTeammatesChange([
        ...selectedTeammates,
        { id: teammate.id, name: teammate.name, email: teammate.email }
      ]);
    }
  };

  const handleAddManualTeammate = () => {
    if (!manualEmail || !manualName) return;

    onTeammatesChange([
      ...selectedTeammates,
      { name: manualName, email: manualEmail }
    ]);

    setManualEmail('');
    setManualName('');
    setShowManualForm(false);
  };

  const handleRemoveTeammate = (email: string) => {
    onTeammatesChange(selectedTeammates.filter(t => t.email !== email));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          Assign Teammates
        </CardTitle>
        <CardDescription>
          Select existing teammates or invite new ones to this job
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected teammates */}
        {selectedTeammates.length > 0 && (
          <div>
            <Label className="text-sm font-medium">Selected Teammates</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedTeammates.map((teammate, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-2">
                  <span>{teammate.name}</span>
                  <span className="text-xs text-muted-foreground">({teammate.email})</span>
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => handleRemoveTeammate(teammate.email)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Add existing teammate */}
        {availableTeammates.length > 0 && (
          <div>
            <Label className="text-sm font-medium">Add Existing Teammate</Label>
            <Select onValueChange={handleAddExistingTeammate}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select a teammate..." />
              </SelectTrigger>
              <SelectContent>
                {availableTeammates.map((teammate) => (
                  <SelectItem key={teammate.id} value={teammate.id!}>
                    <div className="flex items-center gap-2">
                      <span>{teammate.name}</span>
                      <span className="text-xs text-muted-foreground">({teammate.email})</span>
                      {teammate.role && (
                        <Badge variant="outline" className="text-xs">
                          {teammate.role}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Manual teammate addition */}
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Invite New Teammate</Label>
            {!showManualForm && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowManualForm(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add by Email
              </Button>
            )}
          </div>
          
          {showManualForm && (
            <div className="mt-2 space-y-3 p-3 border rounded-md bg-muted/50">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="manual-name" className="text-xs">Name</Label>
                  <Input
                    id="manual-name"
                    placeholder="Teammate name"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    size="sm"
                  />
                </div>
                <div>
                  <Label htmlFor="manual-email" className="text-xs">Email</Label>
                  <Input
                    id="manual-email"
                    type="email"
                    placeholder="teammate@example.com"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    size="sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddManualTeammate}
                  disabled={!manualEmail || !manualName}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Add & Invite
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowManualForm(false);
                    setManualEmail('');
                    setManualName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {selectedTeammates.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No teammates assigned to this job yet
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TeammateSelector;
