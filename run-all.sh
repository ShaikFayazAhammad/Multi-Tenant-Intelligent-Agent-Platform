#!/bin/bash
echo "========================================"
echo "EFS VMS - Automated Setup and Start"
echo "========================================"
echo ""
echo "Running setup in automated mode..."
./setup-environment.sh --auto

if [ $? -ne 0 ]; then
    echo "Setup failed! Please check the output above."
    exit 1
fi

echo ""
echo "Setup completed successfully. Starting development servers..."
./start-all-dev.sh
