import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Edit, 
  Trash2, 
  MapPin, 
  Phone, 
  Truck, 
  User,
  Building,
  Navigation,
  Clock,
  Search,
  Filter,
  Eye,
  Settings,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { apiService } from '@/services/api';
import InteractiveMap from '@/components/InteractiveMap';

const EnhancedTruckManagement = () => {
  const { toast } = useToast();
  const [trucks, setTrucks] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBranch, setFilterBranch] = useState('all');
  const [formData, setFormData] = useState({
    truckId: '',
    driverName: '',
    driverPhone: '',
    driverEmail: '',
    licensePlate: '',
    make: '',
    model: '',
    year: '',
    assignedBranch: '',
    latitude: '',
    longitude: '',
    address: ''
  });

  const statusOptions = [
    { value: 'available', label: 'Available', color: 'bg-green-500' },
    { value: 'dispatched', label: 'Dispatched', color: 'bg-yellow-500' },
    { value: 'en-route', label: 'En Route', color: 'bg-blue-500' },
    { value: 'at-location', label: 'At Location', color: 'bg-purple-500' },
    { value: 'completed', label: 'Completed', color: 'bg-indigo-500' },
    { value: 'maintenance', label: 'Maintenance', color: 'bg-orange-500' },
    { value: 'offline', label: 'Offline', color: 'bg-gray-500' }
  ];

  // Load trucks and branches
  const loadData = async () => {
    try {
      setLoading(true);
      const [trucksResponse, branchesResponse] = await Promise.all([
        apiService.getTrucks(),
        apiService.getBranches()
      ]);

      if (trucksResponse.success) {
        setTrucks(trucksResponse.data);
      }
      if (branchesResponse.success) {
        setBranches(branchesResponse.data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
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
            description: "GPS coordinates have been set to current location"
          });
        },
        (error) => {
          toast({
            title: "Location Error",
            description: "Could not get current location",
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
      
      const truckData = {
        truckId: formData.truckId,
        driver: {
          name: formData.driverName,
          phone: formData.driverPhone,
          email: formData.driverEmail
        },
        vehicle: {
          licensePlate: formData.licensePlate,
          make: formData.make,
          model: formData.model,
          year: parseInt(formData.year)
        },
        assignedBranch: formData.assignedBranch,
        currentLocation: {
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          address: formData.address
        }
      };

      let response;
      if (selectedTruck) {
        response = await apiService.updateTruck(selectedTruck._id, truckData);
      } else {
        response = await apiService.createTruck(truckData);
      }

      if (response.success) {
        toast({
          title: "Success",
          description: `Truck ${selectedTruck ? 'updated' : 'created'} successfully`
        });
        setIsDialogOpen(false);
        resetForm();
        loadData();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${selectedTruck ? 'update' : 'create'} truck`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      truckId: '',
      driverName: '',
      driverPhone: '',
      driverEmail: '',
      licensePlate: '',
      make: '',
      model: '',
      year: '',
      assignedBranch: '',
      latitude: '',
      longitude: '',
      address: ''
    });
    setSelectedTruck(null);
  };

  // Edit truck
  const handleEdit = (truck) => {
    setSelectedTruck(truck);
    setFormData({
      truckId: truck.truckId,
      driverName: truck.driver?.name || '',
      driverPhone: truck.driver?.phone || '',
      driverEmail: truck.driver?.email || '',
      licensePlate: truck.vehicle?.licensePlate || '',
      make: truck.vehicle?.make || '',
      model: truck.vehicle?.model || '',
      year: truck.vehicle?.year?.toString() || '',
      assignedBranch: truck.assignedBranch?._id || '',
      latitude: truck.currentLocation?.latitude?.toString() || '',
      longitude: truck.currentLocation?.longitude?.toString() || '',
      address: truck.currentLocation?.address || ''
    });
    setIsDialogOpen(true);
  };

  // Update truck status
  const handleStatusUpdate = async (truckId, newStatus) => {
    try {
      const response = await apiService.updateTruckStatus(truckId, newStatus);
      if (response.success) {
        toast({
          title: "Success",
          description: "Truck status updated successfully"
        });
        loadData();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update truck status",
        variant: "destructive"
      });
    }
  };

  // Assign truck to branch
  const handleBranchAssignment = async (truckId, branchId) => {
    try {
      const response = await apiService.assignTruckToBranch(truckId, branchId);
      if (response.success) {
        toast({
          title: "Success",
          description: "Truck assigned to branch successfully"
        });
        loadData();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign truck to branch",
        variant: "destructive"
      });
    }
  };

  // Filter trucks
  const filteredTrucks = trucks.filter(truck => {
    const matchesSearch = truck.truckId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         truck.driver?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         truck.vehicle?.licensePlate?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || truck.status === filterStatus;
    const matchesBranch = filterBranch === 'all' || truck.assignedBranch?._id === filterBranch;
    
    return matchesSearch && matchesStatus && matchesBranch;
  });

  // Get status badge color
  const getStatusColor = (status) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    return statusOption ? statusOption.color : 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Fleet Management</h2>
          <p className="text-gray-400">Manage trucks, drivers, and branch assignments</p>
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
              Add Truck
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-red-900/30">
            <DialogHeader>
              <DialogTitle className="text-white">
                {selectedTruck ? 'Edit Truck' : 'Add New Truck'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-black/50">
                  <TabsTrigger value="basic" className="text-white data-[state=active]:bg-red-600">
                    Basic Info
                  </TabsTrigger>
                  <TabsTrigger value="driver" className="text-white data-[state=active]:bg-red-600">
                    Driver Details
                  </TabsTrigger>
                  <TabsTrigger value="location" className="text-white data-[state=active]:bg-red-600">
                    Location & Branch
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="truckId" className="text-white">Truck ID *</Label>
                      <Input
                        id="truckId"
                        value={formData.truckId}
                        onChange={(e) => handleInputChange('truckId', e.target.value)}
                        placeholder="TRK-001"
                        className="bg-black/50 border-red-900/30 text-white"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="licensePlate" className="text-white">License Plate *</Label>
                      <Input
                        id="licensePlate"
                        value={formData.licensePlate}
                        onChange={(e) => handleInputChange('licensePlate', e.target.value.toUpperCase())}
                        placeholder="KDA 123A"
                        className="bg-black/50 border-red-900/30 text-white"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="make" className="text-white">Make</Label>
                      <Input
                        id="make"
                        value={formData.make}
                        onChange={(e) => handleInputChange('make', e.target.value)}
                        placeholder="Toyota"
                        className="bg-black/50 border-red-900/30 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="model" className="text-white">Model</Label>
                      <Input
                        id="model"
                        value={formData.model}
                        onChange={(e) => handleInputChange('model', e.target.value)}
                        placeholder="Hilux"
                        className="bg-black/50 border-red-900/30 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="year" className="text-white">Year</Label>
                      <Input
                        id="year"
                        type="number"
                        value={formData.year}
                        onChange={(e) => handleInputChange('year', e.target.value)}
                        placeholder="2023"
                        min="1990"
                        max={new Date().getFullYear() + 1}
                        className="bg-black/50 border-red-900/30 text-white"
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="driver" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="driverName" className="text-white">Driver Name *</Label>
                      <Input
                        id="driverName"
                        value={formData.driverName}
                        onChange={(e) => handleInputChange('driverName', e.target.value)}
                        placeholder="John Doe"
                        className="bg-black/50 border-red-900/30 text-white"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="driverPhone" className="text-white">Driver Phone *</Label>
                      <Input
                        id="driverPhone"
                        value={formData.driverPhone}
                        onChange={(e) => handleInputChange('driverPhone', e.target.value)}
                        placeholder="+254 700 000 000"
                        className="bg-black/50 border-red-900/30 text-white"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="driverEmail" className="text-white">Driver Email</Label>
                    <Input
                      id="driverEmail"
                      type="email"
                      value={formData.driverEmail}
                      onChange={(e) => handleInputChange('driverEmail', e.target.value)}
                      placeholder="driver@autocare.com"
                      className="bg-black/50 border-red-900/30 text-white"
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="location" className="space-y-4">
                  <div>
                    <Label htmlFor="assignedBranch" className="text-white">Assigned Branch *</Label>
                    <Select 
                      value={formData.assignedBranch} 
                      onValueChange={(value) => handleInputChange('assignedBranch', value)}
                    >
                      <SelectTrigger className="bg-black/50 border-red-900/30 text-white">
                        <SelectValue placeholder="Select a branch" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-red-900/30">
                        {branches.map(branch => (
                          <SelectItem key={branch._id} value={branch._id}>
                            {branch.name} ({branch.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="address" className="text-white">Current Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Current location address"
                      className="bg-black/50 border-red-900/30 text-white"
                    />
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
                  {loading ? 'Saving...' : (selectedTruck ? 'Update Truck' : 'Create Truck')}
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
                  placeholder="Search trucks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-black/50 border-red-900/30 text-white"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48 bg-black/50 border-red-900/30 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-red-900/30">
                <SelectItem value="all">All Status</SelectItem>
                {statusOptions.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterBranch} onValueChange={setFilterBranch}>
              <SelectTrigger className="w-48 bg-black/50 border-red-900/30 text-white">
                <SelectValue placeholder="Filter by branch" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-red-900/30">
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map(branch => (
                  <SelectItem key={branch._id} value={branch._id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Trucks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTrucks.map(truck => (
          <motion.div
            key={truck._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group"
          >
            <Card className="bg-black/50 border-red-900/30 hover:border-red-600/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Truck className="w-5 h-5 text-red-500" />
                      {truck.truckId}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-gray-300">
                        {truck.vehicle?.licensePlate}
                      </Badge>
                      <Badge className={getStatusColor(truck.status)}>
                        {truck.status.replace('-', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(truck)}
                      className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {}} // Handle delete
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
                    <User className="w-4 h-4 text-blue-400" />
                    <span>{truck.driver?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-green-400" />
                    <span>{truck.driver?.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-purple-400" />
                    <span>{truck.assignedBranch?.name || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-400" />
                    <span>Last seen: {new Date(truck.lastSeen).toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-red-900/30">
                  <div className="flex items-center justify-between">
                    <Select
                      value={truck.status}
                      onValueChange={(value) => handleStatusUpdate(truck._id, value)}
                    >
                      <SelectTrigger className="w-32 h-8 bg-black/50 border-red-900/30 text-white text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-red-900/30">
                        {statusOptions.map(status => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select
                      value={truck.assignedBranch?._id || ''}
                      onValueChange={(value) => handleBranchAssignment(truck._id, value)}
                    >
                      <SelectTrigger className="w-32 h-8 bg-black/50 border-red-900/30 text-white text-xs">
                        <SelectValue placeholder="Branch" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-red-900/30">
                        {branches.map(branch => (
                          <SelectItem key={branch._id} value={branch._id}>
                            {branch.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredTrucks.length === 0 && (
        <Card className="bg-black/50 border-red-900/30">
          <CardContent className="text-center py-12">
            <Truck className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-white text-lg font-medium mb-2">No trucks found</h3>
            <p className="text-gray-400 mb-4">
              {searchTerm || filterStatus !== 'all' || filterBranch !== 'all'
                ? 'No trucks match your search criteria' 
                : 'Get started by adding your first truck'}
            </p>
            {!searchTerm && filterStatus === 'all' && filterBranch === 'all' && (
              <Button 
                onClick={() => {
                  resetForm();
                  setIsDialogOpen(true);
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Truck
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fleet Map */}
      {trucks.length > 0 && (
        <Card className="bg-black/50 border-red-900/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Navigation className="w-5 h-5 text-red-500" />
              Fleet Tracking Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InteractiveMap 
              height={600}
              showControls={true}
              autoRefresh={true}
              refreshInterval={10000} // 10 seconds for truck tracking
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedTruckManagement;