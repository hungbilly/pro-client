import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Users, Mail, User, X } from 'lucide-react';
import { toast } from 'sonner';
import { Teammate } from '@/types/teammate';
import { getTeammates } from '@/lib/teammateStorage';
import { useCompany } from '@/components/CompanySelector';

interface TeammateSelection {
  id?: string;
  name: string;
  email: string;
  isNew?: boolean;
}

interface TeammateSelectorProps {
  selectedTeammates: TeammateSelection[];
  onTeammatesChange: (teammates: TeammateSelection[]) => void;
}

const TeammateSelector: React.FC<TeammateSelectorProps> = ({
  selectedTeammates,
  onTeammatesChange
}) => {
  const { selectedCompany } = useCompany();
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddNew, setShowAddNew] = useState(false);
  const [newTeammate, setNewTeammate] = useState({ name: '', email: '' });

  useEffect(() => {
    const fetchTeammates = async () => {
      if (!selectedCompany) return;
      
      try {
        setLoading(true);
        const data = await getTeammates(selectedCompany.id);
        setTeammates(data);
      } catch (error) {
        console.error('Error fetching teammates:', error);
        toast.error('Failed to load teammates');
      } finally {
        setLoading(false);
      }
    };

    fetchTeammates();
  }, [selectedCompany]);

  const handleTeammateToggle = (teammate: Teammate, checked: boolean) => {
    if (checked) {
      const newSelection = {
        id: teammate.id,
        name: teammate.name,
        email: teammate.email
      };
      onTeammatesChange([...selectedTeammates, newSelection]);
    } else {
      onTeammatesChange(selectedTeammates.filter(t => t.id !== teammate.id));
    }
  };

  const handleAddNewTeammate = () => {
    if (!newTeammate.name.trim() || !newTeammate.email.trim()) {
      toast.error('Please enter both name and email');
      return;
    }

    // Check if email already exists in selected teammates
    if (selectedTeammates.some(t => t.email === newTeammate.email)) {
      toast.error('This teammate is already selected');
      return;
    }

    const newSelection = {
      name: newTeammate.name.trim(),
      email: newTeammate.email.trim(),
      isNew: true
    };

    onTeammatesChange([...selectedTeammates, newSelection]);
    setNewTeammate({ name: '', email: '' });
    setShowAddNew(false);
    toast.success('New teammate added to selection');
  };

  const handleRemoveSelected = (email: string) => {
    onTeammatesChange(selectedTeammates.filter(t => t.email !== email));
  };

  const isTeammateSelected = (teammate: Teammate) => {
    return selectedTeammates.some(t => t.id === teammate.id);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (!selectedCompany) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Please select a company first</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Assign Teammates
        </CardTitle>
        <CardDescription>
          Select existing teammates or add new ones for this job
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected Teammates */}
        {selectedTeammates.length > 0 && (
          <div>
            <Label className="text-sm font-medium">Selected Teammates ({selectedTeammates.length})</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedTeammates.map((teammate) => (
                <Badge
                  key={teammate.email}
                  variant={teammate.isNew ? "secondary" : "default"}
                  className="flex items-center gap-1 pr-1"
                >
                  <User className="h-3 w-3" />
                  {teammate.name}
                  {teammate.isNew && <span className="text-xs">(new)</span>}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleRemoveSelected(teammate.email)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Existing Teammates */}
        {loading ? (
          <p className="text-center py-4">Loading teammates...</p>
        ) : teammates.length > 0 ? (
          <div>
            <Label className="text-sm font-medium">Existing Teammates</Label>
            <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
              {teammates.map((teammate) => (
                <div
                  key={teammate.id}
                  className="flex items-center gap-3 p-2 border rounded-lg bg-muted/50"
                >
                  <Checkbox
                    id={`teammate-${teammate.id}`}
                    checked={isTeammateSelected(teammate)}
                    onCheckedChange={(checked) => 
                      handleTeammateToggle(teammate, checked as boolean)
                    }
                  />
                  
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInitials(teammate.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="font-medium text-sm">{teammate.name}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {teammate.email}
                    </div>
                    {teammate.role && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {teammate.role}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">
            No teammates found. Add some teammates in Settings first, or add a new one below.
          </p>
        )}

        {/* Add New Teammate */}
        <div>
          {!showAddNew ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddNew(true)}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Teammate
            </Button>
          ) : (
            <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
              <Label className="text-sm font-medium">Add New Teammate</Label>
              <div className="grid grid-cols-1 gap-2">
                <Input
                  placeholder="Teammate name"
                  value={newTeammate.name}
                  onChange={(e) => setNewTeammate({ ...newTeammate, name: e.target.value })}
                />
                <Input
                  type="email"
                  placeholder="teammate@example.com"
                  value={newTeammate.email}
                  onChange={(e) => setNewTeammate({ ...newTeammate, email: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddNewTeammate}
                  className="flex-1"
                >
                  Add to Selection
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddNew(false);
                    setNewTeammate({ name: '', email: '' });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TeammateSelector;
