# Restore step 1, "install a fresh quick start and start it once", on the same machine: every
# container and volume of the quick start goes (the backup files stay in this folder), and it starts
# again from nothing, with new secrets. What follows restores the backup into it.
docker compose down -v
docker compose up -d --wait
