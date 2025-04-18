
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Palette, PlusCircle, Trash2, Edit, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import ThemeColorPicker from '@/components/ThemeColorPicker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ThemePreview from '@/components/ThemePreview';

interface ThemeColors {
  background: string;
  moduleBackground: string;
  titleBarBackground: string;
  text: string;
  mutedText: string;
  accent: string;
  border: string;
  buttonPrimary: string;
  buttonPrimaryForeground: string;
  hover: string;
}

interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
  isSystem?: boolean;
}

const DEFAULT_THEME_COLORS: ThemeColors = {
  background: '195 20% 96%',
  moduleBackground: '0 0% 100%',
  titleBarBackground: '195 30% 90%',
  text: '200 50% 20%',
  mutedText: '200 30% 50%',
  accent: '190 60% 50%',
  border: '195 20% 85%',
  buttonPrimary: '190 60% 50%',
  buttonPrimaryForeground: '0 0% 100%',
  hover: '190 60% 60%',
};

const AdminThemes = () => {
  const { user, isAdmin } = useAuth();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [isCreatingTheme, setIsCreatingTheme] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  const [currentThemeColors, setCurrentThemeColors] = useState<ThemeColors>(DEFAULT_THEME_COLORS);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);

  useEffect(() => {
    fetchThemes();
  }, []);

  const fetchThemes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('themes').select('*').order('name');
      
      if (error) throw error;
      
      // Process themes to ensure they have valid color structures
      const processedThemes = data.map(theme => ({
        ...theme,
        colors: theme.colors || DEFAULT_THEME_COLORS
      }));
      
      setThemes(processedThemes);
      if (processedThemes.length > 0 && !selectedThemeId) {
        setSelectedThemeId(processedThemes[0].id);
      }
    } catch (error) {
      console.error('Error fetching themes:', error);
      toast.error('Failed to load themes');
    } finally {
      setLoading(false);
    }
  };

  const handleStartCreateTheme = () => {
    setIsCreatingTheme(true);
    setEditingTheme(null);
    setNewThemeName('');
    setCurrentThemeColors({ ...DEFAULT_THEME_COLORS });
  };

  const handleCancelCreate = () => {
    setIsCreatingTheme(false);
  };

  const handleCreateTheme = async () => {
    if (!newThemeName.trim()) {
      toast.error('Theme name is required');
      return;
    }

    try {
      const { data, error } = await supabase.from('themes').insert({
        name: newThemeName.trim(),
        colors: currentThemeColors
      }).select();

      if (error) throw error;

      toast.success('Theme created successfully');
      setIsCreatingTheme(false);
      await fetchThemes();
      if (data && data[0]) {
        setSelectedThemeId(data[0].id);
      }
    } catch (error) {
      console.error('Error creating theme:', error);
      toast.error('Failed to create theme');
    }
  };

  const handleEditTheme = (theme: Theme) => {
    setEditingTheme(theme);
    setIsCreatingTheme(false);
    setCurrentThemeColors({ ...theme.colors });
  };

  const handleCancelEdit = () => {
    setEditingTheme(null);
  };

  const handleUpdateTheme = async () => {
    if (!editingTheme) return;

    try {
      const { error } = await supabase
        .from('themes')
        .update({
          name: editingTheme.name,
          colors: currentThemeColors
        })
        .eq('id', editingTheme.id);

      if (error) throw error;

      toast.success('Theme updated successfully');
      setEditingTheme(null);
      await fetchThemes();
    } catch (error) {
      console.error('Error updating theme:', error);
      toast.error('Failed to update theme');
    }
  };

  const handleDeleteTheme = async (themeId: string) => {
    try {
      // Check if this theme is in use by any companies
      const { data: companies, error: checkError } = await supabase
        .from('companies')
        .select('id')
        .eq('theme', themeId);
      
      if (checkError) throw checkError;
      
      if (companies && companies.length > 0) {
        toast.error('Cannot delete theme that is in use by companies');
        return;
      }

      const confirmDelete = window.confirm('Are you sure you want to delete this theme?');
      if (!confirmDelete) return;

      const { error } = await supabase
        .from('themes')
        .delete()
        .eq('id', themeId);

      if (error) throw error;

      toast.success('Theme deleted successfully');
      await fetchThemes();
      
      if (selectedThemeId === themeId) {
        setSelectedThemeId(themes.length > 1 ? themes[0].id : null);
      }
    } catch (error) {
      console.error('Error deleting theme:', error);
      toast.error('Failed to delete theme');
    }
  };

  const handleColorChange = (colorKey: keyof ThemeColors, value: string) => {
    setCurrentThemeColors(prev => ({
      ...prev,
      [colorKey]: value
    }));
  };

  const handleThemeNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editingTheme) {
      setEditingTheme({
        ...editingTheme,
        name: e.target.value
      });
    } else {
      setNewThemeName(e.target.value);
    }
  };

  const handleSelectTheme = (themeId: string) => {
    setSelectedThemeId(themeId);
    setEditingTheme(null);
    setIsCreatingTheme(false);
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p>You do not have access to this area. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex items-center">
        <Palette className="mr-3 h-10 w-10 text-purple-600" />
        <h1 className="text-3xl font-bold">Theme Management</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Themes</CardTitle>
              <CardDescription>Manage application themes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Available Themes</h3>
                  <Button 
                    onClick={handleStartCreateTheme} 
                    size="sm"
                    className="flex items-center"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Theme
                  </Button>
                </div>
                
                {loading ? (
                  <div className="text-center py-4">Loading themes...</div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {themes.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        No themes found. Create your first theme.
                      </div>
                    ) : (
                      themes.map(theme => (
                        <div 
                          key={theme.id}
                          className={`p-3 rounded-md flex justify-between items-center cursor-pointer ${
                            selectedThemeId === theme.id 
                              ? 'bg-accent text-accent-foreground' 
                              : 'bg-background hover:bg-accent/10'
                          }`}
                          onClick={() => handleSelectTheme(theme.id)}
                        >
                          <div className="flex items-center">
                            <div className="flex space-x-1 mr-3">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: `hsl(${theme.colors.background})` }}
                              />
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: `hsl(${theme.colors.accent})` }}
                              />
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: `hsl(${theme.colors.buttonPrimary})` }}
                              />
                            </div>
                            <span>{theme.name}</span>
                            {theme.isSystem && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                System
                              </span>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditTheme(theme);
                              }}
                              className="h-8 w-8"
                              disabled={theme.isSystem}
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTheme(theme.id);
                              }}
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100"
                              disabled={theme.isSystem}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {isCreatingTheme && (
            <Card>
              <CardHeader>
                <CardTitle>Create New Theme</CardTitle>
                <CardDescription>Define colors for your new theme</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="theme-name">Theme Name</Label>
                    <Input
                      id="theme-name"
                      value={newThemeName}
                      onChange={handleThemeNameChange}
                      placeholder="Enter theme name"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Tabs defaultValue="colors" className="w-full">
                      <TabsList className="w-full">
                        <TabsTrigger value="colors" className="flex-1">Colors</TabsTrigger>
                        <TabsTrigger value="preview" className="flex-1">Preview</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="colors" className="mt-4">
                        <ThemeColorPicker 
                          colors={currentThemeColors} 
                          onChange={handleColorChange}
                        />
                      </TabsContent>
                      
                      <TabsContent value="preview" className="mt-4">
                        <ThemePreview colors={currentThemeColors} themeName={newThemeName || "New Theme"} />
                      </TabsContent>
                    </Tabs>
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={handleCancelCreate}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateTheme} className="bg-green-600 hover:bg-green-700 text-white">
                      <Save className="h-4 w-4 mr-2" />
                      Create Theme
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {editingTheme && (
            <Card>
              <CardHeader>
                <CardTitle>Edit Theme: {editingTheme.name}</CardTitle>
                <CardDescription>Modify theme colors and appearance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-theme-name">Theme Name</Label>
                    <Input
                      id="edit-theme-name"
                      value={editingTheme.name}
                      onChange={handleThemeNameChange}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Tabs defaultValue="colors" className="w-full">
                      <TabsList className="w-full">
                        <TabsTrigger value="colors" className="flex-1">Colors</TabsTrigger>
                        <TabsTrigger value="preview" className="flex-1">Preview</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="colors" className="mt-4">
                        <ThemeColorPicker 
                          colors={currentThemeColors} 
                          onChange={handleColorChange}
                        />
                      </TabsContent>
                      
                      <TabsContent value="preview" className="mt-4">
                        <ThemePreview 
                          colors={currentThemeColors} 
                          themeName={editingTheme.name} 
                        />
                      </TabsContent>
                    </Tabs>
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateTheme} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedThemeId && !isCreatingTheme && !editingTheme && (
            <Card>
              <CardHeader>
                <CardTitle>Theme Preview</CardTitle>
                <CardDescription>See how the selected theme appears</CardDescription>
              </CardHeader>
              <CardContent>
                {themes.length > 0 && (
                  <ThemePreview 
                    colors={themes.find(t => t.id === selectedThemeId)?.colors || DEFAULT_THEME_COLORS}
                    themeName={themes.find(t => t.id === selectedThemeId)?.name || ""}
                  />
                )}
                <div className="mt-4 flex justify-end">
                  <Button 
                    onClick={() => handleEditTheme(themes.find(t => t.id === selectedThemeId)!)}
                    disabled={!selectedThemeId || themes.find(t => t.id === selectedThemeId)?.isSystem}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit This Theme
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminThemes;
