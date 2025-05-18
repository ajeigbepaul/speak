import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useContext, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AuthContext } from "../contextApi/AuthContext";
import {
  db,
  doc,
  getDownloadURL,
  getStorage,
  ref,
  setDoc,
  uploadBytes,
} from "../firebase";
// import * as DocumentPicker from 'expo-document-picker';
import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CounselorSignupScreen() {
  // Basic Info
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Address (Object)
  const [address, setAddress] = useState({
    street: "",
    city: "",
    state: "",
    country: "",
  });

  // Professional Info
  const [occupation, setOccupation] = useState("");
  //   const [licenseNumber, setLicenseNumber] = useState('');
  //   const [specialization, setSpecialization] = useState('');

  // Files
  //   const [licenseFile, setLicenseFile] = useState<DocumentPicker.DocumentResult | null>(null);
  const [profilePic, setProfilePic] =
    useState<ImagePicker.ImagePickerResult | null>(null);

  const [loading, setLoading] = useState(false);
  const { signUp } = useContext(AuthContext);
  const router = useRouter();

  // Handle Profile Picture Upload
  const handleProfilePicUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setProfilePic(result);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to select image");
    }
  };

  // Handle License Upload (same as before)
  const handleLicenseUpload = async () => {
    /* ... */
  };

  const handleSubmit = async () => {
    // Validation
    if (
      !email ||
      !password ||
      !fullName ||
      !phoneNumber ||
      !address.street ||
      !address.city ||
      !address.state ||
      !address.country ||
      !occupation ||
      !profilePic
    ) {
      Alert.alert("Error", "All fields are required");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      // 1. Create auth account
      const user = await signUp(email, password);
      // After user creation
      const storage = getStorage();

      // Upload profile picture
      const profilePicRef = ref(storage, `profilePics/${user.uid}/avatar.jpg`);
      if (!profilePic?.assets || !profilePic.assets[0]?.uri) {
        throw new Error("Profile picture is missing or invalid.");
      }
      const profilePicResponse = await fetch(profilePic.assets[0].uri);
      const profilePicBlob = await profilePicResponse.blob();
      const profilePicUrl = await uploadBytes(
        profilePicRef,
        profilePicBlob
      ).then((snapshot) => getDownloadURL(snapshot.ref));

      // Upload license
      // const licenseRef = ref(storage, `licenses/${user.uid}/${licenseFile.name}`);
      // const licenseResponse = await fetch(licenseFile.uri);
      // const licenseBlob = await licenseResponse.blob();
      // const licenseUrl = await uploadBytes(licenseRef, licenseBlob)
      //   .then((snapshot) => getDownloadURL(snapshot.ref));
      // 2. Create counselor document
      await setDoc(doc(db, "counselors", user.uid), {
        role: "counselor",
        personalInfo: {
          fullName,
          email,
          phoneNumber,
          profilePic: profilePicUrl, // Will upload to storage later
          address,
        },
        professionalInfo: {
          occupation,
          //   licenseNumber,
          //   specialization,
          //   licenseFile: licenseFile.uri,
        },
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 3. Create public profile
      await setDoc(doc(db, "publicProfiles", user.uid), {
        displayName: fullName,
        occupation,
        profilePic: profilePicUrl,
        available: false,
        rating: 0,
        reviewCount: 0,
      });

      Alert.alert(
        "Application Submitted",
        "Your account is pending verification.",
        [{ text: "OK", onPress: () => router.replace("/") }]
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 16 }}>
        <View className="flex-row items-center mb-6">
          {/* Optional back button */}
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <MaterialIcons name="arrow-back" size={24} color="#3b82f6" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-800">
            Counselor Application
          </Text>
        </View>
        

        {/* Section 1: Profile Picture */}
        <Text className="text-lg font-medium text-gray-700 mb-4">
          Profile Picture
        </Text>
        <TouchableOpacity
          className="w-32 h-32 bg-gray-200 rounded-full self-center mb-6 justify-center items-center overflow-hidden"
          onPress={handleProfilePicUpload}
        >
          {profilePic?.assets ? (
            <Image
              source={{ uri: profilePic.assets[0].uri }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <FontAwesome name="user-circle" size={48} color="#9ca3af" />
          )}
        </TouchableOpacity>

        {/* Section 2: Personal Information */}
        <Text className="text-lg font-medium text-gray-700 mb-4">
          Personal Information
        </Text>
        <TextInput
          className="bg-white p-4 rounded-lg mb-4"
          placeholder="Full Name"
          value={fullName}
          onChangeText={setFullName}
        />
        <TextInput
          className="bg-white p-4 rounded-lg mb-4"
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          className="bg-white p-4 rounded-lg mb-4"
          placeholder="Phone Number"
          keyboardType="phone-pad"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
        />
        <TextInput
          className="bg-white p-4 rounded-lg mb-4"
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          className="bg-white p-4 rounded-lg mb-6"
          placeholder="Confirm Password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {/* Section 3: Address */}
        <Text className="text-lg font-medium text-gray-700 mb-4">Address</Text>
        <TextInput
          className="bg-white p-4 rounded-lg mb-4"
          placeholder="Street Address"
          value={address.street}
          onChangeText={(text) => setAddress({ ...address, street: text })}
        />
        <TextInput
          className="bg-white p-4 rounded-lg mb-4"
          placeholder="City"
          value={address.city}
          onChangeText={(text) => setAddress({ ...address, city: text })}
        />
        <TextInput
          className="bg-white p-4 rounded-lg mb-4"
          placeholder="State/Province"
          value={address.state}
          onChangeText={(text) => setAddress({ ...address, state: text })}
        />
        <TextInput
          className="bg-white p-4 rounded-lg mb-6"
          placeholder="Country"
          value={address.country}
          onChangeText={(text) => setAddress({ ...address, country: text })}
        />

        {/* Section 4: Professional Information */}
        <Text className="text-lg font-medium text-gray-700 mb-4">
          Professional Information
        </Text>
        <TextInput
          className="bg-white p-4 rounded-lg mb-4"
          placeholder="Occupation (e.g., Psychologist)"
          value={occupation}
          onChangeText={setOccupation}
        />
        {/* <TextInput
        className="bg-white p-4 rounded-lg mb-4"
        placeholder="License Number"
        value={licenseNumber}
        onChangeText={setLicenseNumber}
      /> */}
        {/* <TextInput
        className="bg-white p-4 rounded-lg mb-4"
        placeholder="Specialization"
        value={specialization}
        onChangeText={setSpecialization}
      /> */}

        {/* Section 5: License Upload */}
        {/* <Text className="text-lg font-medium text-gray-700 mb-2">License Verification</Text>
      <TouchableOpacity
        className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6 items-center"
        onPress={handleLicenseUpload}
      >
        <MaterialIcons name="upload-file" size={24} color="#3b82f6" />
        <Text className="text-blue-500 mt-2">
          {licenseFile?.type === 'success' ? licenseFile.name : 'Upload License (PDF)'}
        </Text>
      </TouchableOpacity> */}

        {/* Submit Button */}
        <TouchableOpacity
          className={`py-4 rounded-lg ${
            loading ? "bg-blue-400" : "bg-blue-500"
          } mb-6`}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-center text-lg">
              Submit Application
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
