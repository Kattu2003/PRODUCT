#!/usr/bin/env python3
"""
GPU Test Script - Verify GPU access and CUDA functionality
Run this script to check if your GPU is accessible and CUDA is working.
"""

import torch
import sys

def test_gpu_access():
    print("🔍 GPU Access Test")
    print("=" * 50)
    
    # Check if CUDA is available
    print(f"CUDA Available: {torch.cuda.is_available()}")
    
    if torch.cuda.is_available():
        # Get CUDA version
        print(f"PyTorch CUDA Version: {torch.version.cuda}")
        
        # Get GPU count
        gpu_count = torch.cuda.device_count()
        print(f"GPU Count: {gpu_count}")
        
        # Get GPU information
        for i in range(gpu_count):
            gpu_name = torch.cuda.get_device_name(i)
            gpu_memory = torch.cuda.get_device_properties(i).total_memory / 1024**3
            print(f"GPU {i}: {gpu_name}")
            print(f"  Memory: {gpu_memory:.1f} GB")
            print(f"  Compute Capability: {torch.cuda.get_device_capability(i)}")
        
        # Test GPU tensor operations
        print("\n🧪 Testing GPU Tensor Operations...")
        try:
            # Create tensor on GPU
            x = torch.randn(1000, 1000).cuda()
            y = torch.randn(1000, 1000).cuda()
            
            # Perform matrix multiplication
            z = torch.mm(x, y)
            
            print("✅ GPU tensor operations successful!")
            print(f"   Result tensor shape: {z.shape}")
            print(f"   Result tensor device: {z.device}")
            
            # Clean up
            del x, y, z
            torch.cuda.empty_cache()
            
        except Exception as e:
            print(f"❌ GPU tensor operations failed: {e}")
            return False
            
    else:
        print("❌ CUDA is not available")
        print("   Make sure you have:")
        print("   1. NVIDIA GPU drivers installed")
        print("   2. CUDA toolkit installed")
        print("   3. PyTorch with CUDA support")
        return False
    
    return True

def test_docker_gpu():
    print("\n🐳 Docker GPU Test")
    print("=" * 50)
    
    # Check if running in Docker
    try:
        with open('/proc/1/cgroup', 'r') as f:
            if 'docker' in f.read():
                print("✅ Running in Docker container")
                
                # Check for NVIDIA runtime
                try:
                    import subprocess
                    result = subprocess.run(['nvidia-smi'], capture_output=True, text=True)
                    if result.returncode == 0:
                        print("✅ NVIDIA runtime accessible in Docker")
                        print("GPU Information:")
                        print(result.stdout)
                    else:
                        print("❌ NVIDIA runtime not accessible in Docker")
                        print("   Make sure to run with: docker run --gpus all ...")
                except Exception as e:
                    print(f"❌ Error checking NVIDIA runtime: {e}")
                    
            else:
                print("ℹ️  Not running in Docker container")
                
    except Exception as e:
        print(f"ℹ️  Could not determine Docker status: {e}")

if __name__ == "__main__":
    print("🚀 Starting GPU Tests...\n")
    
    # Test basic GPU access
    gpu_ok = test_gpu_access()
    
    # Test Docker GPU access
    test_docker_gpu()
    
    print("\n" + "=" * 50)
    if gpu_ok:
        print("🎉 GPU tests completed successfully!")
        print("   Your GPU is accessible and ready for ML workloads.")
    else:
        print("⚠️  GPU tests failed!")
        print("   Please check your GPU drivers and CUDA installation.")
    
    sys.exit(0 if gpu_ok else 1)
