
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Edit2, Trash2, Mail, Phone, User } from 'lucide-react';
import { toast } from 'sonner';
import { Teammate } from '@/types/teammate';
import { getTeammates, saveTeammate, updateTeammate, deleteTeammate } from '@/lib/teammateStorage';
import { useCompany } from '@/components/CompanySelector';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const TeammateManagement: React.FC = () => {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeammate, setEditingTeammate] = useState<Teammate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    notes: ''
  });

  const { data: teammates = [], isLoading } = useQuery({
    queryKey: ['teammates', selectedCompany?.id],
    queryFn: () => selectedCompany ? getTeammates(selectedCompany.id) : [],
    enabled: !!selectedCompany
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: '',
      notes: ''
    });
    setEditingTeammate(null);
  };

  const handleOpenDialog = (teammate?: Teammate) => {
    if (teammate) {
      setEditingTeammate(teammate);
      setFormData({
        name: teammate.name,
        email: teammate.email,
        phone: teammate.phone || '',
        role: teammate.role || '',
        notes: teammate.notes || ''
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompany) {
      toast.error('Please select a company first');
      return;
    }

    try {
      if (editingTeammate) {
        await updateTeammate(editingTeammate.id!, formData);
        toast.success('Teammate updated successfully');
      } else {
        await saveTeammate({
          ...formData,
          company_id: selectedCompany.id
        });
        toast.success('Teammate added successfully');
      }
      
      queryClient.invalidateQueries({ queryKey: ['teammates', selectedCompany.id] });
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving teammate:', error);
      toast.error('Failed to save teammate');
    }
  };

  const handleDelete = async (teammate: Teammate) => {
    if (!teammate.id) return;
    
    try {
      await deleteTeammate(teammate.id);
      toast.success('Teammate deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['teammates', selectedCompany?.id] });
    } catch (error) {
      console.error('Error deleting teammate:', error);
      toast.error('Failed to delete teammate');
    }
  };

  if (!selectedCompany) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Please select a company to manage teammates</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Management
            </CardTitle>
            <CardDescription>
              Manage your photography team members and collaborators
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Teammate
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingTeammate ? 'Edit Teammate' : 'Add New Teammate'}
                </DialogTitle>
                <DialogDescription>
                  {editingTeammate ? 'Update teammate information' : 'Add a new team member to collaborate on jobs'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    placeholder="e.g., Second Photographer, Assistant"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes about this teammate"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingTeammate ? 'Update' : 'Add'} Teammate
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center py-4">Loading teammates...</p>
        ) : teammates.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No teammates added yet</p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Teammate
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teammates.map((teammate) => (
                <TableRow key={teammate.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{teammate.name}</div>
                        {teammate.notes && (
                          <div className="text-sm text-muted-foreground">{teammate.notes}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3" />
                        {teammate.email}
                      </div>
                      {teammate.phone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {teammate.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {teammate.role ? (
                      <Badge variant="outline">{teammate.role}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(teammate)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(teammate)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default TeammateManagement;
