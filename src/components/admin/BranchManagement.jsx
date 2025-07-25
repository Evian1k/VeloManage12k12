import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Edit, 
  Trash2, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Users, 
  Truck,
  Building,
  Search,
  Filter,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { apiService } from '@/services/api';
import InteractiveMap from '@/components/InteractiveMap';

const BranchManagement = () => {
  const { toast } = useToast();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    latitude: '',
    longitude: '',
    phone: '',
    email: '',
    services: [],
    workingHours: {
      monday: { open: '08:00', close: '18:00', isOpen: true },
      tuesday: { open: '08:00', close: '18:00', isOpen: true },
      wednesday: { open: '08:00', close: '18:00', isOpen: true },
      thursday: { open: '08:00', close: '18:00', isOpen: true },
      friday: { open: '08:00', close: '18:00', isOpen: true },
      saturday: { open: '08:00', close: '16:00', isOpen: true },
      sunday: { open: '10:00', close: '14:00', isOpen: false }
    }
  });

  const serviceOptions = [
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'repair', label: 'Repair' },
    { value: 'inspection', label: 'Inspection' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'fuel', label: 'Fuel Service' },
    { value: 'car_wash', label: 'Car Wash' }
  ];

  const daysOfWeek = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ];

  // Load branches
  const loadBranches = async () => {
    try {
      setLoading(true);
      const response = await apiService.getBranches();
      if (response.success) {
        setBranches(response.data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load branches",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle working hours changes
  const handleWorkingHoursChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [day]: {
          ...prev.workingHours[day],
          [field]: value
        }
      }
    }));
  };

  // Get current location for GPS coordinates
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString()
          }));
          toast({
            title: "Location Updated",
            description: "GPS coordinates have been set to your current location"
          });
        },
        (error) => {
          toast({
            title: "Location Error",
            description: "Could not get your current location",
            variant: "destructive"
          });
        }
      );
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const branchData = {
        ...formData,
        location: {
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          coordinates: {
            latitude: parseFloat(formData.latitude),
            longitude: parseFloat(formData.longitude)
          }
        },
        contact: {
          phone: formData.phone,
          email: formData.email
        }
      };

      let response;
      if (selectedBranch) {
        response = await apiService.updateBranch(selectedBranch._id, branchData);
      } else {
        response = await apiService.createBranch(branchData);
      }

      if (response.success) {
        toast({
          title: "Success",
          description: `Branch ${selectedBranch ? 'updated' : 'created'} successfully`
        });
        setIsDialogOpen(false);
        resetForm();
        loadBranches();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${selectedBranch ? 'update' : 'create'} branch`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      latitude: '',
      longitude: '',
      phone: '',
      email: '',
      services: [],
      workingHours: {
        monday: { open: '08:00', close: '18:00', isOpen: true },
        tuesday: { open: '08:00', close: '18:00', isOpen: true },
        wednesday: { open: '08:00', close: '18:00', isOpen: true },
        thursday: { open: '08:00', close: '18:00', isOpen: true },
        friday: { open: '08:00', close: '18:00', isOpen: true },
        saturday: { open: '08:00', close: '16:00', isOpen: true },
        sunday: { open: '10:00', close: '14:00', isOpen: false }
      }
    });
    setSelectedBranch(null);
  };

  // Edit branch
  const handleEdit = (branch) => {
    setSelectedBranch(branch);
    setFormData({
      name: branch.name,
      code: branch.code,
      address: branch.location?.address || '',
      city: branch.location?.city || '',
      state: branch.location?.state || '',
      zipCode: branch.location?.zipCode || '',
      latitude: branch.location?.coordinates?.latitude?.toString() || '',
      longitude: branch.location?.coordinates?.longitude?.toString() || '',
      phone: branch.contact?.phone || '',
      email: branch.contact?.email || '',
      services: branch.services || [],
      workingHours: branch.workingHours || {
        monday: { open: '08:00', close: '18:00', isOpen: true },
        tuesday: { open: '08:00', close: '18:00', isOpen: true },
        wednesday: { open: '08:00', close: '18:00', isOpen: true },
        thursday: { open: '08:00', close: '18:00', isOpen: true },
        friday: { open: '08:00', close: '18:00', isOpen: true },
        saturday: { open: '08:00', close: '16:00', isOpen: true },
        sunday: { open: '10:00', close: '14:00', isOpen: false }
      }
    });
    setIsDialogOpen(true);
  };

  // Delete branch
  const handleDelete = async (branchId) => {
    if (!confirm('Are you sure you want to delete this branch?')) return;
    
    try {
      const response = await apiService.deleteBranch(branchId);
      if (response.success) {
        toast({
          title: "Success",
          description: "Branch deleted successfully"
        });
        loadBranches();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete branch",
        variant: "destructive"
      });
    }
  };

  // Filter branches
  const filteredBranches = branches.filter(branch => {
    const matchesSearch = branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         branch.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         branch.location?.city?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && branch.isActive) ||
                         (filterStatus === 'inactive' && !branch.isActive);
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Branch Management</h2>
          <p className="text-gray-400">Manage company branches and locations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                resetForm();
                setIsDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Branch
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-red-900/30">
            <DialogHeader>
              <DialogTitle className="text-white">
                {selectedBranch ? 'Edit Branch' : 'Add New Branch'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-black/50">
                  <TabsTrigger value="basic" className="text-white data-[state=active]:bg-red-600">
                    Basic Info
                  </TabsTrigger>
                  <TabsTrigger value="location" className="text-white data-[state=active]:bg-red-600">
                    Location
                  </TabsTrigger>
                  <TabsTrigger value="hours" className="text-white data-[state=active]:bg-red-600">
                    Working Hours
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name" className="text-white">Branch Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Enter branch name"
                        className="bg-black/50 border-red-900/30 text-white"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="code" className="text-white">Branch Code *</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                        placeholder="e.g., CBD, WL"
                        className="bg-black/50 border-red-900/30 text-white"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone" className="text-white">Phone Number *</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="+254 700 000 000"
                        className="bg-black/50 border-red-900/30 text-white"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-white">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="branch@autocare.com"
                        className="bg-black/50 border-red-900/30 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-white">Services Offered</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {serviceOptions.map(service => (
                        <label key={service.value} className="flex items-center space-x-2 text-white">
                          <input
                            type="checkbox"
                            checked={formData.services.includes(service.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleInputChange('services', [...formData.services, service.value]);
                              } else {
                                handleInputChange('services', formData.services.filter(s => s !== service.value));
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm">{service.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="location" className="space-y-4">
                  <div>
                    <Label htmlFor="address" className="text-white">Street Address *</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Enter full street address"
                      className="bg-black/50 border-red-900/30 text-white"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city" className="text-white">City *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="Nairobi"
                        className="bg-black/50 border-red-900/30 text-white"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="state" className="text-white">State/County</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        placeholder="Nairobi County"
                        className="bg-black/50 border-red-900/30 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="zipCode" className="text-white">Postal Code</Label>
                      <Input
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={(e) => handleInputChange('zipCode', e.target.value)}
                        placeholder="00100"
                        className="bg-black/50 border-red-900/30 text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="latitude" className="text-white">Latitude *</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="any"
                        value={formData.latitude}
                        onChange={(e) => handleInputChange('latitude', e.target.value)}
                        placeholder="-1.2921"
                        className="bg-black/50 border-red-900/30 text-white"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="longitude" className="text-white">Longitude *</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="any"
                        value={formData.longitude}
                        onChange={(e) => handleInputChange('longitude', e.target.value)}
                        placeholder="36.8219"
                        className="bg-black/50 border-red-900/30 text-white"
                        required
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        onClick={getCurrentLocation}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <MapPin className="w-4 h-4 mr-2" />
                        Use My Location
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="hours" className="space-y-4">
                  <div className="space-y-3">
                    {daysOfWeek.map(day => (
                      <div key={day.key} className="flex items-center space-x-4 p-3 bg-black/30 rounded-lg">
                        <div className="w-24">
                          <Label className="text-white font-medium">{day.label}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.workingHours[day.key]?.isOpen}
                            onChange={(e) => handleWorkingHoursChange(day.key, 'isOpen', e.target.checked)}
                            className="rounded"
                          />
                          <Label className="text-white text-sm">Open</Label>
                        </div>
                        {formData.workingHours[day.key]?.isOpen && (
                          <>
                            <div>
                              <Input
                                type="time"
                                value={formData.workingHours[day.key]?.open || '08:00'}
                                onChange={(e) => handleWorkingHoursChange(day.key, 'open', e.target.value)}
                                className="bg-black/50 border-red-900/30 text-white w-32"
                              />
                            </div>
                            <span className="text-white">to</span>
                            <div>
                              <Input
                                type="time"
                                value={formData.workingHours[day.key]?.close || '18:00'}
                                onChange={(e) => handleWorkingHoursChange(day.key, 'close', e.target.value)}
                                className="bg-black/50 border-red-900/30 text-white w-32"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-end space-x-2 pt-4 border-t border-red-900/30">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="border-red-900/30 text-white hover:bg-red-900/20"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {loading ? 'Saving...' : (selectedBranch ? 'Update Branch' : 'Create Branch')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters and Search */}
      <Card className="bg-black/50 border-red-900/30">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search branches..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-black/50 border-red-900/30 text-white"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48 bg-black/50 border-red-900/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-red-900/30">
                <SelectItem value="all">All Branches</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Branches List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBranches.map(branch => (
          <motion.div
            key={branch._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group"
          >
            <Card className="bg-black/50 border-red-900/30 hover:border-red-600/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Building className="w-5 h-5 text-red-500" />
                      {branch.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-gray-300">
                        {branch.code}
                      </Badge>
                      <Badge className={branch.isActive ? 'bg-green-500' : 'bg-gray-500'}>
                        {branch.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(branch)}
                      className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(branch._id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-red-400" />
                    <span>{branch.location?.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-green-400" />
                    <span>{branch.contact?.phone}</span>
                  </div>
                  {branch.contact?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-400" />
                      <span>{branch.contact.email}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-red-900/30">
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      <span>{branch.assignedTrucks?.length || 0} trucks</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{branch.staff?.filter(s => s.isActive).length || 0} staff</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <Badge className={`text-xs ${branch.isOpenNow?.() ? 'bg-green-500' : 'bg-red-500'}`}>
                      {branch.isOpenNow?.() ? 'Open' : 'Closed'}
                    </Badge>
                  </div>
                </div>
                
                {branch.services && branch.services.length > 0 && (
                  <div className="pt-2">
                    <div className="flex flex-wrap gap-1">
                      {branch.services.slice(0, 3).map(service => (
                        <Badge key={service} variant="outline" className="text-xs text-gray-400">
                          {service}
                        </Badge>
                      ))}
                      {branch.services.length > 3 && (
                        <Badge variant="outline" className="text-xs text-gray-400">
                          +{branch.services.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredBranches.length === 0 && (
        <Card className="bg-black/50 border-red-900/30">
          <CardContent className="text-center py-12">
            <Building className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-white text-lg font-medium mb-2">No branches found</h3>
            <p className="text-gray-400 mb-4">
              {searchTerm || filterStatus !== 'all' 
                ? 'No branches match your search criteria' 
                : 'Get started by creating your first branch'}
            </p>
            {!searchTerm && filterStatus === 'all' && (
              <Button 
                onClick={() => {
                  resetForm();
                  setIsDialogOpen(true);
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Branch
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Interactive Map */}
      {branches.length > 0 && (
        <Card className="bg-black/50 border-red-900/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-500" />
              Branch Locations Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InteractiveMap 
              height={500}
              showControls={true}
              autoRefresh={true}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BranchManagement;