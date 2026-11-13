ifeq ($(filter %deploy.mk,$(MAKEFILE_LIST)),)
sinclude deploy.mk
endif

CAPS_DEPLOY_DIR=caps-deploy
CAPS_OUT=$(CAPS_DEPLOY_DIR)/out/$(NETWORK)
CAPS_PARTIES=RedStoneOracleUpdater RedStoneOracleViewer
CAPS_READERS_devnet=redstone-hp-test::1220587f50466eb7d0c24a5dde186e2d57620f4dad8289449d2b874d0d6f4a887dc9
CAPS_READERS=$(CAPS_READERS_$(NETWORK))
CAPS_DATA_ID=ETH,BTC,CC
CAPS_FEED_IDS=ETH BTC CC
CAPS_CONFIG=$(CAPS_DEPLOY_DIR)/redstone-primary-prod.json
CAPS_AUTH=$(if $(filter localnet,$(NETWORK)),,get-token)
CAPS_API=$(if $(filter localnet,$(NETWORK)),$(JSON_API),$(CANTON_API))

CAPS_VERIFIER_TEMPLATE_ID=\#caps-verifier-redstone:Caps.Verifier.RedStone:RedStoneVerifier
CAPS_PROPOSAL_TEMPLATE_ID=\#caps-core:Caps.Core.DataDefinition:DefinitionProposal
CAPS_LICENSE_TEMPLATE_ID=\#caps-core:Caps.Core.License:License
CAPS_ARCHIVER_TEMPLATE_ID=\#caps-capsule-archiver:Caps.CapsuleArchiver:CapsuleArchiver
CAPS_ROUND_ARCHIVER_TEMPLATE_ID=\#caps-round-archiver:Caps.RoundArchiver:RoundArchiver
CAPS_ORACLE_TEMPLATE_ID=\#caps-redstone-oracle:RedStoneCapsOracle:RedStoneCapsOracle
CAPS_STATE_TEMPLATE_ID=\#caps-redstone-oracle:RedStoneCapsOracleState:RedStoneCapsOracleState

CAPS_CID=$(shell cat $(CAPS_OUT)/$(1).txt 2>/dev/null)
CAPS_CREATED_CID=[.transaction.events[] | .CreatedEvent.contractId // empty][0]

CAPS_JQ_ARGS=--arg operator "$(PARTY_UPDATER)" \
	--arg viewer "$(PARTY_VIEWER)" \
	--arg readers "$(CAPS_READERS)" \
	--arg dataId "$(CAPS_DATA_ID)" \
	--arg feedIds "$(CAPS_FEED_IDS)" \
	--arg attestationKeys "$(CAPS_ATTESTATION_KEYS)" \
	--arg now "$(shell date +%s)000" \
	--arg verifier "$(call CAPS_CID,verifier)" \
	--arg definition "$(call CAPS_CID,definition)" \
	--arg license "$(call CAPS_CID,license)" \
	--slurpfile config $(CAPS_CONFIG)

CAPS_CMD=CANTON_API="$(CAPS_API)" \
	TOKEN="$(if $(CAPS_AUTH),$(TOKEN))" \
	ACT_AS='["$(PARTY_UPDATER)"]' \
	./scripts/canton-cmd.sh

define caps_create
	mkdir -p $(CAPS_OUT)
	TEMPLATE_ID="$(2)" \
	CREATE_ARGS="$$(jq -n $(CAPS_JQ_ARGS) -f $(CAPS_DEPLOY_DIR)/$(1).jq)" \
	CMD_NAME=caps-$(1) \
	JQ='$(CAPS_CREATED_CID)' \
	$(CAPS_CMD) > $(CAPS_OUT)/$(1).txt
	@echo "$(1): $$(cat $(CAPS_OUT)/$(1).txt)"
endef

caps-parties:
	@for party in $(CAPS_PARTIES); do \
	make list_parties | grep -q "\"$$party::" || \
	$(MAKE) allocate_parties PARTIES=$$party || exit 1; \
	done

caps-verifier: check-party-suffix $(CAPS_AUTH)
	$(call caps_create,verifier,$(CAPS_VERIFIER_TEMPLATE_ID))

caps-definition-proposal: check-party-suffix $(CAPS_AUTH)
	$(call caps_create,definition-proposal,$(CAPS_PROPOSAL_TEMPLATE_ID))

caps-definition: check-party-suffix $(CAPS_AUTH)
	TEMPLATE_ID="$(CAPS_PROPOSAL_TEMPLATE_ID)" \
	CONTRACT_ID="$(call CAPS_CID,definition-proposal)" \
	CHOICE=DefinitionProposal_Finalize \
	CMD_NAME=caps-definition \
	JQ='.transaction.events[] | .ExercisedEvent.exerciseResult // empty' \
	$(CAPS_CMD) > $(CAPS_OUT)/definition.json
	jq -r '._1' $(CAPS_OUT)/definition.json > $(CAPS_OUT)/definition.txt
	jq -r '._2' $(CAPS_OUT)/definition.json > $(CAPS_OUT)/round-head.txt
	@echo "definition: $$(cat $(CAPS_OUT)/definition.txt)"
	@echo "round head: $$(cat $(CAPS_OUT)/round-head.txt)"

caps-license: check-party-suffix $(CAPS_AUTH)
	$(call caps_create,license,$(CAPS_LICENSE_TEMPLATE_ID))

caps-archiver: check-party-suffix $(CAPS_AUTH)
	$(call caps_create,archiver,$(CAPS_ARCHIVER_TEMPLATE_ID))

caps-round-archiver: check-party-suffix $(CAPS_AUTH)
	$(call caps_create,round-archiver,$(CAPS_ROUND_ARCHIVER_TEMPLATE_ID))

caps-oracle: check-party-suffix $(CAPS_AUTH)
	$(call caps_create,oracle,$(CAPS_ORACLE_TEMPLATE_ID))

caps-state: check-party-suffix $(CAPS_AUTH)
	$(call caps_create,state,$(CAPS_STATE_TEMPLATE_ID))

.PHONY: caps-deploy
caps-deploy:
	$(if $(filter localnet,$(NETWORK)),$(MAKE) caps-parties)
	$(MAKE) caps-verifier
	$(MAKE) caps-definition-proposal
	$(MAKE) caps-definition
	$(MAKE) caps-license
	$(MAKE) caps-archiver
	$(MAKE) caps-round-archiver
	$(MAKE) caps-oracle
	$(MAKE) caps-state
