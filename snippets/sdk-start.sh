# The SDK page starts in the clone, as its step 1 leaves the reader, with the quick start's
# recipe-script folder gone so step 3 makes it afresh. Step 1 itself (clone, npm ci, npm pack of
# the SDK) is what the quick start already ran in this same clone.
cd ../..
rm -rf ../recipe-script
