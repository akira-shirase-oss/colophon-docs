# A person's own credential for the API, as `colophon login` gets it: the device sign-in, approved
# by the person signed in to the Studio. Exports PERSONAL_TOKEN (Akira Shirase, the project's owner).
jar=$(mktemp)
curl -fsS -c "$jar" -X POST "$BASE/auth/signin" -H 'Content-Type: application/json' \
	--data '{"email": "akira@example.com", "password": "quick-start-password"}' >/dev/null
started=$(curl -fsS -X POST "$BASE/auth/device" -H 'Content-Type: application/json' --data '{"client_name": "colophon CLI"}')
curl -fsS -b "$jar" -X POST "$BASE/auth/device/approve" -H "Origin: $BASE" \
	-H "X-CSRF-Token: $(awk '$6 == "colophon_csrf" { print $7 }' "$jar")" -H 'Content-Type: application/json' \
	--data "{\"user_code\": \"$(jq -r .data.user_code <<<"$started")\"}" >/dev/null
PERSONAL_TOKEN=$(curl -fsS -X POST "$BASE/auth/device/token" -H 'Content-Type: application/json' \
	--data "{\"device_secret\": \"$(jq -r .data.device_secret <<<"$started")\"}" | jq -r .data.access_token)
export PERSONAL_TOKEN
rm -f "$jar"
unset jar started
